exports = async function() {
  // Obtém a data atual sem o horário
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Acessa as coleções necessárias
  const transactionsCollection = context.services.get("mongodb-atlas").db("clients").collection("transactions");
  const walletsCollection = context.services.get("mongodb-atlas").db("clients").collection("wallets");

  // Consulta as transações que correspondem aos critérios
  const transactions = await transactionsCollection.find({
    "cashback_availability": today,
    "cashback_status": "NOT_EARNED"
  }).toArray();

  // Para cada transação encontrada, atualiza a carteira correspondente e altera o status da transação
  for (const transaction of transactions) {
    // Encontra a carteira associada à transação
    const wallet = await walletsCollection.findOne({ "_id": transaction.wallet_id });

    // Acrescenta o valor do cashback ganho ao saldo da carteira
    const newBalance = wallet.balance + transaction.earned_cashback;

    // Atualiza o saldo da carteira
    await walletsCollection.updateOne(
        { "_id": transaction.wallet_id },
        { "$set": { "balance": newBalance } }
    );

    // Atualiza o status da transação para "EARNED"
    await transactionsCollection.updateOne(
        { "_id": transaction._id },
        { "$set": { "cashback_status": "EARNED" } }
    );
  }

  return "Operação concluída com sucesso";
};
