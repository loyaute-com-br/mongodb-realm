exports = async function () {
    const mongodb = context.services.get("mongodb-atlas");
    const session = mongodb.startSession();

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const ordersCollection = context.services.get("mongodb-atlas").db("clients").collection("orders");
        const walletsCollection = context.services.get("mongodb-atlas").db("clients").collection("wallets");

        const orders = await ordersCollection.find({
            "cashback_availability": today,
            "cashback_status": "NOT_EARNED"
        }).toArray();

        const orderOptions = {
            readPreference: "primary",
            readConcern: {level: "local"},
            writeConcern: {w: "majority"}
        };

        for (const order of orders) {
            await session.withTransaction(async () => {
                const wallet = await walletsCollection.findOne({"_id": order.wallet_id});

                const newBalance = wallet.balance + order.earned_cashback;

                await walletsCollection.updateOne(
                    {"_id": order.wallet_id},
                    {"$set": {"balance": newBalance}}
                );

                await ordersCollection.updateOne(
                    {"_id": order._id},
                    {"$set": {"cashback_status": "EARNED"}}
                );

                // If earned cashback is 10 or more, send the SMS
                if(order.earned_cashback >= 10) {
                    const response = await context.http.post({
                        url: "https://api.twilio.com/2010-04-01/Accounts/AC35fb7c08c4ba66c7f92e7c6d235eddcd/Messages.json",
                        body: {
                            To: "whatsapp:+5511978486889",
                            From: "whatsapp:+14155238886",
                            Body: "Your appointment is coming up on July 21 at 3PM"
                        },
                        headers: {
                            Authorization: "Basic " + btoa("AC35fb7c08c4ba66c7f92e7c6d235eddcd:e9175cbb0e7a3872332c227c312380b3")
                        },
                        encodeBodyAsJSON: true
                    });
                }
            }, transactionOptions);

            await session.commitTransaction();
        }
    } catch (error) {
        await session.abortTransaction();

        response.setStatusCode(400);
        response.setBody(JSON.stringify({"error": {"message": error.message}}));
    } finally {
        // Encerrar a sessão
        session.endSession();
    }

    return "Operação concluída com sucesso";
};
