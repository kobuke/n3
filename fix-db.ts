import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

async function fix() {
  const { data, error } = await supabase
    .from('ticket_usages')
    .update({ wallet_address: '0xF945aD76B4b9074AE2e71bfa112E33bD07a13809' })
    .eq('wallet_address', 'undefined');
    
  console.log("Error:", error);
  console.log("Fixed usages");
}

fix();
