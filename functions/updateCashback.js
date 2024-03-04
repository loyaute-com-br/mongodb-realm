exports = async function () {
    const session = mongodb.startSession();

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const transactionsCollection = context.services.get("mongodb-atlas").db("clients").collection("transactions");
        const walletsCollection = context.services.get("mongodb-atlas").db("clients").collection("wallets");

        const transactions = await transactionsCollection.find({
            "cashback_availability": today,
            "cashback_status": "NOT_EARNED"
        }).toArray();

        const transactionOptions = {
            readPreference: "primary",
            readConcern: {level: "local"},
            writeConcern: {w: "majority"}
        };

        for (const transaction of transactions) {
            await session.withTransaction(async () => {
                const wallet = await walletsCollection.findOne({"_id": transaction.wallet_id});

                const newBalance = wallet.balance + transaction.earned_cashback;

                await walletsCollection.updateOne(
                    {"_id": transaction.wallet_id},
                    {"$set": {"balance": newBalance}}
                );

                await transactionsCollection.updateOne(
                    {"_id": transaction._id},
                    {"$set": {"cashback_status": "EARNED"}}
                );
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
