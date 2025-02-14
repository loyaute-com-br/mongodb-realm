exports = async function(request, response){
  try {
    const body = JSON.parse(await request.body.text());

    if (body.start_date === undefined || body.end_date === undefined) {
      response.setStatusCode(400);
      response.setBody(JSON.stringify({ "errorType": "MISSING_DATA" }));
      return;
    }

    // Check if the user has permission
    if (!context.user || !context.user.custom_data.roles.includes("seller")) {
      response.setStatusCode(401);
      return response.setBody(JSON.stringify({ "errorType": "UNAUTHORIZED_ACCESS" }));
    }

    const clientsDB = context.services.get("mongodb-atlas").db("clients");
    const establishmentsDB = context.services.get("mongodb-atlas").db("establishments");

    // Pipeline for transactions counting
    const transactionsPipeline = getTransactionsPipeline(body);

    // Pipeline for wallets counting
    const walletsPipeline = getWalletsPipeline(body);

    // Pipeline for finding duplicated wallets
    const duplicatedWalletsPipeline = getDuplicatedWalletsPipeline(body);

    // Pipeline for finding recurring sales
    const recurringPipeline = getRecurringPipeline(body);

    // Pipeline for average ticket
    const averageTicketPipeline = getAverageTicketPipeline(body);

    // Execute aggregations
    const transactionsResult = await executeAggregation(establishmentsDB, "orders", transactionsPipeline);
    const walletsResult = await executeAggregation(clientsDB, "wallets", walletsPipeline);
    const duplicatedWalletsResult = await executeAggregation(establishmentsDB, "orders", duplicatedWalletsPipeline);
    const recurringResult = await executeAggregation(establishmentsDB, "orders", recurringPipeline);
    const averageTicketResult = await executeAggregation(establishmentsDB, "orders", averageTicketPipeline);

    // Return the results
    return {
      totalRevenue: transactionsResult[0].totalRevenue,
      redeemed: transactionsResult[0].countWithCashback,
      newClients: walletsResult[0].count,
      activeClients: duplicatedWalletsResult.length > 0 ? duplicatedWalletsResult[0].totalClientsWithMultipleTransactions : 0,
      recurringSales: recurringResult.length > 0 ? recurringResult[0].totalPurchasesByClientsWithMultipleTransactions : 0,
      averageTicket: averageTicketResult
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
        establishment_id: context.user.custom_data.establishment_id,
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
        establishment_id: context.user.custom_data.establishment_id,
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
        establishment_id: context.user.custom_data.establishment_id,
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
        establishment_id: context.user.custom_data.establishment_id,
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
        from: "orders",
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

function getAverageTicketPipeline(body) {
  return [
    {
      $match: {
        establishment_id: context.user.custom_data.establishment_id,
        timeStamp: {
          $gte: new Date(body.start_date),
          $lt: new Date(body.end_date)
        }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$timeStamp" } },
        totalTransactions: { $sum: 1 },
        totalValue: { $sum: "$value" }
      }
    },
    {
      $project: {
        _id: 0,
        day: "$_id",
        averageTicket: { $divide: ["$totalValue", "$totalTransactions"] }
      }
    }
  ];
}