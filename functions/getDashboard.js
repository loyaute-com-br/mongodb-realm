exports = async function(request, response){
  try {
    const { body } = request;
    const { start_date, end_date } = body;

    // Check if there is data in the request body
    if (!body || !start_date || !end_date) {
      response.setStatusCode(400);
      return response.setBody(JSON.stringify({ "errorType": "MISSING_DATA" }));
    }

    // Check if the user has permission
    if (!context.user || !context.user.custom_data.roles.includes("seller")) {
      response.setStatusCode(401);
      return response.setBody(JSON.stringify({ "errorType": "UNAUTHORIZED_ACCESS" }));
    }

    const clientsDB = context.services.get("mongodb-atlas").db("clients");

    // Pipeline for transactions counting
    const transactionsPipeline = getTransactionsPipeline(body);

    // Pipeline for wallets counting
    const walletsPipeline = getWalletsPipeline(body);

    // Pipeline for finding duplicated wallets
    const duplicatedWalletsPipeline = getDuplicatedWalletsPipeline(body);

    // Pipeline for finding recurring sales
    const recurringPipeline = getRecurringPipeline(body);

    // Execute aggregations
    const transactionsResult = await executeAggregation(clientsDB, "transactions", transactionsPipeline);
    const walletsResult = await executeAggregation(clientsDB, "wallets", walletsPipeline);
    const duplicatedWalletsResult = await executeAggregation(clientsDB, "transactions", duplicatedWalletsPipeline);
    const recurringResult = await executeAggregation(clientsDB, "transactions", recurringPipeline);

    // Return the results
    return {
      transactions: transactionsResult[0],
      wallets: walletsResult[0],
      duplicatedWalletsCount: duplicatedWalletsResult.length > 0 ? duplicatedWalletsResult[0].totalClientsWithMultipleTransactions : 0,
      recurring: recurringResult.length > 0 ? recurringResult[0].totalPurchasesByClientsWithMultipleTransactions : 0
    };
  } catch (error) {
    console.error("Error:", error);
    response.setStatusCode(500);
    return response.setBody(JSON.stringify({ "errorType": "INTERNAL_SERVER_ERROR" }));
  }
};

// Helper function to execute aggregations
async function executeAggregation(db, collectionName, pipeline) {
  return await db.collection(collectionName).aggregate(pipeline).toArray();
}

// Helper functions to build pipelines
function getTransactionsPipeline(body) {
  return [
    {
      $match: {
        timeStamp: {
          $gte: new Date(body.start_date),
          $lt: new Date(body.end_date)
        }
      }
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$value" },
        count: { $sum: 1 },
        countWithCashback: { $sum: { $cond: [{ $eq: ["$used_cashback", true] }, 1, 0] } }
      }
    }
  ];
}

function getWalletsPipeline(body) {
  return [
    {
      $match: {
        timeStamp: {
          $gte: new Date(body.start_date),
          $lt: new Date(body.end_date)
        }
      }
    },
    {
      $group: {
        _id: null,
        count: { $sum: 1 }
      }
    }
  ];
}

function getDuplicatedWalletsPipeline(body) {
  return [
    {
      $match: {
        timeStamp: {
          $gte: new Date(body.start_date),
          $lt: new Date(body.end_date)
        }
      }
    },
    {
      $group: {
        _id: "$wallet_id",
        totalTransactions: { $sum: 1 }
      }
    },
    {
      $match: {
        totalTransactions: { $gte: 2 }
      }
    },
    {
      $count: "totalClientsWithMultipleTransactions"
    }
  ];
}

function getRecurringPipeline(body) {
  return [
    {
      $match: {
        timeStamp: {
          $gte: new Date(body.start_date),
          $lt: new Date(body.end_date)
        }
      }
    },
    {
      $group: {
        _id: "$wallet_id",
        totalTransactions: { $sum: 1 }
      }
    },
    {
      $match: {
        totalTransactions: { $gte: 2 }
      }
    },
    {
      $lookup: {
        from: "transactions",
        localField: "_id",
        foreignField: "wallet_id",
        as: "allTransactions"
      }
    },
    {
      $unwind: "$allTransactions"
    },
    {
      $count: "totalPurchasesByClientsWithMultipleTransactions"
    }
  ];
}
