exports = async function(request, response){
  const mongodb = context.services.get("mongodb-atlas");

  // Iniciar a transação
  const session = mongodb.startSession();
  try {
    if (request.body === undefined) {
      throw new Error(`Request body was not defined.`);
    }

    if (!context.user) {
      response.setStatusCode(401);
      response.setBody(JSON.stringify({ "error": { "message": `User not authenticated.` }}));
      return;
    }

    // if (!context.user.custom_data.roles.includes("seller")) {
    //   response.setStatusCode(401);
    //   response.setBody(JSON.stringify({ "error": { "message": `User not authorized.` }}));
    //   return;
    // }

    const body = JSON.parse(await request.body.text());

    if(!body.cpf || !body.value || body.using_cashback == undefined) {
      throw new Error(`Request body missing data.`);
    }

    const client = await mongodb.db("clients").collection("clients").findOne(
        { "cpf": body.cpf });

    if (!client) {
      response.setStatusCode(404);
      response.setBody(JSON.stringify({ "error": { "message": `Client with CPF ${body.cpf} not found.` }}));
      return;
    }

    const wallet = await mongodb.db("clients").collection("wallets").findOne(
        { "client_id": client._id, "establishment_id": context.user.custom_data.establishment_id });

    if (!wallet) {
      response.setStatusCode(404);
      response.setBody(JSON.stringify({ "error": { "message": `Client does not have a wallet in the establishment.` }}));
      return;
    }

    // Calculate new cashback amount
    let newCashback;

    let requestAmount = parseFloat(body.value).toFixed(2);

    if(body.using_cashback === true) {
      requestAmount = requestAmount - wallet.balance;
      newCashback = requestAmount * 0.05;
    } else {
      newCashback = wallet.balance + ((parseFloat(body.value)) * 0.05);
    }

    let earnedCashback = (requestAmount * 0.05).toFixed(2);

    // Update wallet
    const filter = {
      _id: wallet._id
    };

    const update = {
      $set: {
        "balance": newCashback.toFixed(2),
      }
    };

    const database = mongodb.db("clients");

    const transactionOptions = {
      readPreference: "primary",
      readConcern: { level: "local" },
      writeConcern: { w: "majority" }
    };

    await session.withTransaction(async () => {
      // Executar operações dentro da transação
      await database.collection("wallets").updateOne(filter, update);

      const updatedWallet = await mongodb.db("clients").collection("wallets").findOne(
          { "_id": wallet._id });

      let doc = {
        "wallet_id": wallet._id,
        "client_id": client._id,
        "establishment_id": wallet.establishment_id,
        "timeStamp": new Date(),
        "balance": {
          "new": updatedWallet.balance,
          "old": wallet.balance,
        },
        "difference": (updatedWallet.balance - wallet.balance).toFixed(2),
        "value": body.value,
        "used_cashback": body.using_cashback
      }

      await database.collection("transactions").insertOne(doc);
    }, transactionOptions);

    // Comitar a transação
    await session.commitTransaction();

    // await insert transaction

    response.setStatusCode(201);
    response.setBody(JSON.stringify({ "request_amount": requestAmount, "earned_cashback": earnedCashback }));
  } catch (error) {
    await session.abortTransaction();

    response.setStatusCode(400);
    response.setBody(JSON.stringify({ "error": { "message": error.message }}));
  } finally {
    // Encerrar a sessão
    session.endSession();
  }
};
