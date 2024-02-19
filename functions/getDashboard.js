exports = async function(request, response){
  if (request.body === undefined) {
    response.setStatusCode(400);
    response.setBody(JSON.stringify({ "errorType": "MISSING_DATA" }));
    return;
  }

  if (!context.user || !context.user.custom_data.roles.includes("seller")) {
    response.setStatusCode(401);
    response.setBody(JSON.stringify({ "errorType": "UNAUTHORIZED_ACCESS" }));
    return;
  }

  const body = JSON.parse(await request.body.text());

  if (body.start_date === undefined || body.end_date === undefined) {
    response.setStatusCode(400);
    response.setBody(JSON.stringify({ "errorType": "MISSING_DATA" }));
    return;
  }

  const clientsDB = context.services.get("mongodb-atlas").db("clients");

  // Pipeline para contar as transações
  const transactionsPipeline = [
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

  // Pipeline para contar as wallets
  const walletsPipeline = [
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

  // Pipeline para contar as transações duplicadas por wallet
  const duplicatedTransactionsPipeline = [
    {
      $match: {
        timestamp: {
          $gte: new Date(body.start_date),
          $lt: new Date(body.end_date)
        }
      }
    },
    {
      $group: {
        _id: "$wallet_id",
        transactions: { $push: "$$ROOT" },
        count: { $sum: 1 }
      }
    },
    {
      $match: {
        count: { $gt: 1 } // Filtra grupos com mais de uma transação
      }
    }
  ];

  const transactionsResult = await clientsDB.collection("transactions").aggregate(transactionsPipeline).toArray();
  const walletsResult = await clientsDB.collection("wallets").aggregate(walletsPipeline).toArray();
  const duplicatedTransactionsResult = await clientsDB.collection("transactions").aggregate(duplicatedTransactionsPipeline).toArray();

  return {
    transactions: transactionsResult[0],
    wallets: walletsResult[0],
    duplicatedTransactions: duplicatedTransactionsResult
  };
};