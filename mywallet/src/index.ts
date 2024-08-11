import { createApp } from "@deroll/app";
import { createWallet } from "@deroll/wallet";
import { json } from "stream/consumers";
import { getAddress, hexToString , stringToHex } from "viem";

const app=createApp({url: process.env.ROLLUP_HTTP_SERVER_URL || "http://127.0.0.1:5004"});
// handles deposits
const wallet=createWallet();
app.addAdvanceHandler(wallet.handler);

app.addAdvanceHandler(async ({metadata,payload})=>{
  console.log("Input:",metadata,payload)
  const sender=getAddress(metadata.msg_sender);
  try{
    const jsonpayload=JSON.parse(hexToString(payload))
    if (jsonpayload.method==="ether_withdraw")
      console.log("Withdrawing ether")
    const amountToWithdraw:bigint=BigInt(jsonpayload.amount)
    const voucher = wallet.withdrawEther(sender,amountToWithdraw)
    await app.createVoucher(voucher)
    return "accept"

  }catch(e){
    app.createReport({payload:stringToHex(String(e))})
    return "reject"

  }
  return "accept"
})
app.addInspectHandler(async ({payload})=>{
  const url = hexToString(payload).split("/")
  console.log("Inspect call:",url)
  const eth_bal=wallet.etherBalanceOf(<string>url[1])
  await app.createReport({payload:stringToHex(String(eth_bal))})
})
app.start().catch((e)=>{
  console.log(e);
  process.exit(1);
})