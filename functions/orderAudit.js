function formatBRL(valor) {
  let parts = valor.toFixed(2).split('.');
  parts[0] = parts[0].split(/(?=(?:...)*$)/).join('.');
  return 'R$' + parts.join(',');
}

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

      let body = changeEvent.fullDocument.client.toUpperCase() + ', você acumulou ' + formatBRL(changeEvent.fullDocument.balance) + ' de cashback na ' + changeEvent.fullDocument.establishment.toUpperCase() + ', válido até dia ' + (day + '/' + month + '/' + year) + '.'
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

      const accountSid = 'ACe93600fa1b72475db93dc6a743cbb17d';
      const authToken = '84986c410de24216a03c466c64ed116a';
      const twilioClient = require('twilio')(accountSid, authToken);

      twilioClient.messages
          .create({
            body: body,
            from: '+18125788046',
            to: '+55' + changeEvent.fullDocument.client_phone
          })
          .then(message => console.log(message.sid))
          .done();
    }
  } catch(err) {
    console.log("error performing mongodb write: ", err.message);
  }
};
