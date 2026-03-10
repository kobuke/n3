const rpcUrl = "https://polygon-rpc.com";
fetch(rpcUrl, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "eth_getTransactionReceipt",
    params: ["0xd2ce682bc8b1d1121b064199d9a8bcb4a9110219b0598eedc11dd61fbfeff4ef"]
  })
}).then(res => res.json()).then(data => console.log(JSON.stringify(data, null, 2))).catch(err => console.error(err));
