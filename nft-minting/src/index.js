import { createApp } from "@deroll/app";
import { encodeFunctionData, getAddress, hexToString } from "viem";
import StoragecontractAbi from "./storagenft.json";
import nftContractAbi from "./nftabi.json"
let storage_contract_address=""
let nft_contract_address = ""
const app=createApp({
  url:process.env.ROLLUP_HTTP_SERVER_URL || "http://127.0.0.1:5004",
});

app.addAdvanceHandler(async({payload})=>{
  const payloadString=hexToString(payload)
  console.log("payload",payload);
  const jsonPayload=JSON.parse(payloadString)
  if (jsonPayload.method==="set_address"){
     storage_contract_address=getAddress(jsonPayload.address)
    console.log("Address is now set", storage_contract_address)
  }else if(jsonPayload.method==="generate_number"){
    const cartesiGeneratedNumber=jsonPayload.number*2
    console.log("Number generated by cartesi backend is:",cartesiGeneratedNumber)

    // voucher!!
    const callData=encodeFunctionData({
      abi:StoragecontractAbi,
      functionNamee:"store",
      args:[cartesiGeneratedNumber]
    })
    // generate voucher
    app.createVoucher({destination:storage_contract_address,payload:callData})
  }
  else if(jsonPayload.method === "mint_nft"){
    // logic to generate NFT metadata
    const nftmetadata = "this is my base64 image string"

    // generate a report/notice OR inspect 

    // prepare voucher
    const callData = encodeFunctionData({
      abi: nftContractAbi,
      functionName: "mintTo",
      args:[sender]
    })

    // generate voucher
    app.createVoucher({destination: nft_contract_address, payload: callData})
  }
  return "accept"
})

app.start().catch((e)=>{
  console.error(e);
  process.exit(1);
});