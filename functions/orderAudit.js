exports = async function(changeEvent) {
  // A Database Trigger will always call a function with a changeEvent.
  // Documentation on ChangeEvents: https://docs.mongodb.com/manual/reference/change-events/

  // This sample function will listen for events and replicate them to a collection in a different Database

  // Access the _id of the changed document:
  const docId = changeEvent.documentKey._id;

  // Get the MongoDB service you want to use (see "Linked Data Sources" tab)
  // Note: In Atlas Triggers, the service name is defaulted to the cluster name.
  const serviceName = "mongodb-atlas";
  const database = "establishments";
  const collection = context.services.get(serviceName).db(database).collection("transactions");

  // Get the "FullDocument" present in the Insert/Replace/Update ChangeEvents
  try {
    let doc = {
      "changeEvent": changeEvent,
      "wallet_id": changeEvent.fullDocument._id,
      "client_id": changeEvent.fullDocument.client_id,
      "establishment_id": changeEvent.fullDocument.establishment_id,
      "timestamp": changeEvent.wallTime,
      "balance": {
        "new": changeEvent.fullDocument.balance,
        "old": changeEvent.fullDocumentBeforeChange.balance,
      },
      "difference": (changeEvent.fullDocument.balance - changeEvent.fullDocumentBeforeChange.balance)
    }

    await collection.insertOne(doc);

    if(changeEvent.fullDocument.balance > 10) {
      
      let date = changeEvent.fullDocument.expiration_date

      let day = String(date.getDate()).padStart(2, '0');
      let month = String(date.getMonth() + 1).padStart(2, '0'); // Os meses começam do zero
      let year = String(date.getFullYear()).slice(-2); // Pega os dois últimos dígitos do ano

      let body = changeEvent.fullDocument.client.toUpperCase() + ', você acumulou ' + changeEvent.fullDocument.balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) + ' de cashback na ' + changeEvent.fullDocument.establishment.toUpperCase() + ', válido até dia ' + (day + '/' + month + '/' + year) + '.'
      // const client = await mongodb.db("clients").collection("clients").findOne({ "_id": new BSON.ObjectId(changeEvent.fullDocument.client_id) });
      //
      // if (!client) {
      //   body = body + "!client"
      // }
      //
      // const establishment = await mongodb.db("establishments").collection("establishments").findOne({ "_id": new BSON.ObjectId(changeEvent.fullDocument.establishment_id) });
      //
      // if (!establishment) {
      //   body = body + "!establishment"
      // }

      const accountSid = 'AC35fb7c08c4ba66c7f92e7c6d235eddcd';
      const authToken = 'e9175cbb0e7a3872332c227c312380b3';
      const twilioClient = require('twilio')(accountSid, authToken);

      twilioClient.messages
          .create({
            body: body,
            from: 'whatsapp:+14155238886',
            to: 'whatsapp:+5511978486889'
          })
          .then(message => {
            // remove credit
          })
          .done();
    }
  } catch(err) {
    console.log("error performing mongodb write: ", err.message);
  }
};
