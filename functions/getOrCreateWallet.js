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

    if (body.cpf === undefined) {
      response.setStatusCode(400);
      response.setBody(JSON.stringify({ "errorType": "MISSING_DATA", "message": "CPF is missing in the request body." }));
      return;
    }

    if(!(await context.functions.execute("validateCPF", body.cpf))) {
      response.setStatusCode(400);
      response.setBody(JSON.stringify({ "errorType": "INVALID_CPF" }));
      return;
    }
    
    const mongodb = context.services.get("mongodb-atlas");

    const client = await mongodb.db("clients").collection("clients").findOne({ "cpf": await context.functions.execute("encryptData", body.cpf) });

    if (!client) {
      response.setStatusCode(404);
      response.setBody(JSON.stringify({ "errorType": "CLIENT_NOT_FOUND" }));
      return;
    }

    const wallet = await mongodb.db("clients").collection("wallets").findOne({ "client_id": client._id, "establishment_id": context.user.custom_data.establishment_id });

    let balance = 0;

    if (!wallet) {
      let doc = {
        client_id: client._id,
        establishment_id: context.user.custom_data.establishment_id,
        balance: balance,
        timeStamp: new Date(),
      }

      await mongodb.db("clients").collection("wallets").insertOne(doc);
      response.setStatusCode(201);
    } else {
      balance = wallet.balance;
      response.setStatusCode(200);
    }

    response.setBody(JSON.stringify({ "name": client.first_name, "balance": balance }));
  } catch (error) {
    response.setStatusCode(400);
    response.setBody(JSON.stringify({ "errorType": "ERROR", "message": error.message }));
  }
};
