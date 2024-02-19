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
        timestamp: {
          $gte: body.start_date,
          $lt: body.end_date
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
      $group: {
        _id: null,
        count: { $sum: 1 }
      }
    }
  ];

  const transactionsResult = await clientsDB.collection("transactions").aggregate(transactionsPipeline).toArray();
  const walletsResult = await clientsDB.collection("wallets").aggregate(walletsPipeline).toArray();

  return {
    transactions: transactionsResult[0],
    wallets: walletsResult[0]
  };
};


// exports = async function(request, response){
//   try {
//     if (request.body === undefined) {
//       response.setStatusCode(400);
//       response.setBody(JSON.stringify({ "errorType": "MISSING_DATA" }));
//       return;
//     }
//
//     if (!context.user || !context.user.custom_data.roles.includes("seller")) {
//       response.setStatusCode(401);
//       response.setBody(JSON.stringify({ "errorType": "UNAUTHORIZED_ACCESS" }));
//       return;
//     }
//
//     const body = JSON.parse(await request.body.text());
//
//     if (body.start_date === undefined || body.end_date === undefined) {
//       response.setStatusCode(400);
//       response.setBody(JSON.stringify({ "errorType": "MISSING_DATA" }));
//       return;
//     }
//
//     const mongodb = context.services.get("mongodb-atlas");
//
//     const query = {
//       timestamp: {
//         $gte: body.start_date,
//         $lt: body.end_date
//       }
//     };
//
//     const transactions = mongodb.db("clients").collection("transactions")
//         .find({}).toArray();
//
//     let totalRevenue = 0;
//
//     for (let i = 0; i < transactions.length; i++) {
//       totalRevenue += transactions[i].value;
//     }
//
//     return { revenue: totalRevenue, transactions: transactions[0].value };
//     response.setBody(JSON.stringify({ revenue: totalRevenue, transactions: transactions }));
//   } catch (error) {
//     response.setStatusCode(400);
//     response.setBody(JSON.stringify({ "errorType": "ERROR", "message": error.message }));
//   }
// };
