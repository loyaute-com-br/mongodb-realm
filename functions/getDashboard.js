exports = async function(request, response){
  try {
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

    const mongodb = context.services.get("mongodb-atlas");

    const query = {
      timestamp: {
        $gte: body.start_date,
        $lt: body.end_date
      }
    };

    const transactions = mongodb.db("clients").collection("transactions")
        .find({}).toArray();

    return JSON.parse(transactions);

    let totalRevenue = 0;

    for (let i = 0; i < transactions.length; i++) {
      totalRevenue += transactions[i].value;
    }

    // return { revenue: totalRevenue, transactions: transactions[0].value };
    response.setBody(JSON.stringify({ revenue: totalRevenue, transactions: transactions }));
  } catch (error) {
    response.setStatusCode(400);
    response.setBody(JSON.stringify({ "errorType": "ERROR", "message": error.message }));
  }
};
