exports = async function(request, response){
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

    const mongodb = context.services.get("mongodb-atlas");

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

    let requestAmount = parseFloat(body.value);

    if(body.using_cashback === true) {
      requestAmount = requestAmount - wallet.balance;
      newCashback = requestAmount * 0.05;
    } else {
      newCashback = wallet.balance + ((parseFloat(body.value)) * 0.05);
    }

    // Update wallet
    const filter = {
      _id: wallet._id
    };

    const update = {
      $set: {
        "balance": newCashback,
      }
    };

    const database = mongodb.db("clients");

    // Iniciar a transação
    const session = database.getMongo().startSession();
    const transactionOptions = {
      readPreference: "primary",
      readConcern: { level: "local" },
      writeConcern: { w: "majority" }
    };

    await session.withTransaction(async () => {
      // Executar operações dentro da transação
      await database.collection("wallets").updateOne(filter, update);

      const updatedWallet = await mongodb.db("clients").collection("wallets").findOne(
          { "wallet_id": wallet._id });

      let doc = {
        "wallet_id": wallet._id,
        "client_id": client._id,
        "establishment_id": wallet.establishment_id,
        "timestamp": new Date(),
        "balance": {
          "new": updatedWallet.balance,
          "old": wallet.balance,
        },
        "difference": (updatedWallet.balance - wallet.balance)
      }

      await database.collection("transactions").insertOne(doc);
    }, transactionOptions);

    // Comitar a transação
    await session.commitTransaction();

    // await insert transaction

    response.setStatusCode(201);
    response.setBody(JSON.stringify({ "request_amount": requestAmount}));
  } catch (error) {
    await session.abortTransaction();

    response.setStatusCode(400);
    response.setBody(JSON.stringify({ "error": { "message": error.message }}));
  } finally {
    // Encerrar a sessão
    session.endSession();
  }
};
