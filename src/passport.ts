import { z } from "zod";
const address = z.string().regex(/^0x[a-fA-F0-9]{40}$/);
export function paymentRequired(input:{payee:string;asset:string;amount:string;network:string;resource:string;facilitatorUrl:string},description:string){
 const x={...input,payee:address.parse(input.payee),asset:address.parse(input.asset),amount:z.string().regex(/^\\d+$/).parse(input.amount),resource:z.string().url().parse(input.resource),facilitatorUrl:z.string().url().parse(input.facilitatorUrl)};
 return {x402Version:1,error:"X-PAYMENT header is required",accepts:[{scheme:"gokite-aa",network:x.network,maxAmountRequired:x.amount,resource:x.resource,description,mimeType:"application/json",payTo:x.payee,asset:x.asset,maxTimeoutSeconds:300,merchantName:"KiteAI Passport LayerZero Service"}]};
}
export async function settle(header:string,facilitatorUrl:string,network:string){
 const authorization=JSON.parse(Buffer.from(header,"base64").toString("utf8"));
 const verify=await fetch(`${facilitatorUrl}/v2/verify`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({authorization,network})});
 if(!verify.ok) throw new Error(`Payment verification failed (${verify.status})`);
 const result=await verify.json() as {isValid?:boolean}; if(!result.isValid) throw new Error("Payment authorization is invalid");
 const response=await fetch(`${facilitatorUrl}/v2/settle`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({authorization,network})});
 if(!response.ok) throw new Error(`Payment settlement failed (${response.status})`); return response.json();
}
