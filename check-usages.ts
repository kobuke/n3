import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
);

async function check() {
    const { data, error } = await supabase.from('ticket_usages').select('*').order('used_at', { ascending: false }).limit(5);
    console.log("Error:", error);
    console.log("Usages:", data);
}

check();
