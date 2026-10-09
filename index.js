1require("dotenv").config();
const Binance = require("binance-api-node").default;

const client = Binance({
  apiKey: process.env.BINANCE_API_KEY,
  apiSecret: process.env.BINANCE_API_SECRET,
});

const SYMBOL = process.env.SYMBOL || "ETHUSDT";
const BUY_AMOUNT_USDT = Number(process.env.BUY_AMOUNT_USDT || 50);
const TAKE_PROFIT_PERCENT = Number(process.env.TAKE_PROFIT_PERCENT || 5);
const STOP_LOSS_PERCENT = Number(process.env.STOP_LOSS_PERCENT || 5);
const CHECK_INTERVAL_SECONDS = Number(process.env.CHECK_INTERVAL_SECONDS || 60);

let position = null;

async function getPrice() {
  const prices = await client.prices({ symbol: SYMBOL });
  return Number(prices[SYMBOL]);
}

async function buy() {
  const order = await client.order({
    symbol: SYMBOL,
    side: "BUY",
    type: "MARKET",
    quoteOrderQty: BUY_AMOUNT_USDT.toString(),
  });

  const qty = Number(order.executedQty);
  const spent = Number(order.cummulativeQuoteQty);
  const avgBuyPrice = spent / qty;

  position = { qty, avgBuyPrice };

  console.log(`BUY: ${qty} ETH la ${avgBuyPrice} USDT`);
}

async function sell(reason) {
  const qtyToSell = position.qty.toFixed(5);

  const order = await client.order({
    symbol: SYMBOL,
    side: "SELL",
    type: "MARKET",
    quantity: qtyToSell,
  });

  console.log(`SELL: ${reason}. Order ID: ${order.orderId}`);
  position = null;
}

async function loop() {
  try {
    const price = await getPrice();

    if (!position) {
      console.log("Nu am poziție. Cumpăr ETH...");
      await buy();
      return;
    }

    const takeProfitPrice = position.avgBuyPrice * (1 + TAKE_PROFIT_PERCENT / 100);
    const stopLossPrice = position.avgBuyPrice * (1 - STOP_LOSS_PERCENT / 100);

    console.log(
      `ETH: ${price} | Buy: ${position.avgBuyPrice} | TP: ${takeProfitPrice} | SL: ${stopLossPrice}`
    );

    if (price >= takeProfitPrice) {
      await sell(`Profit +${TAKE_PROFIT_PERCENT}%`);
      return;
    }

    if (price <= stopLossPrice) {
      await sell(`Stop Loss -${STOP_LOSS_PERCENT}%`);
      return;
    }
  } catch (err) {
    console.error("Eroare:", err.body || err.message || err);
  }
}

console.log("ETH Profit Bot pornit...");
loop();
setInterval(loop, CHECK_INTERVAL_SECONDS * 1000);
