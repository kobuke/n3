import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({path: '.env.local'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function test() {
  const { data, error } = await supabase.from('user_quest_progress').select(`
    quest_id,
    scanned_at,
    quest_locations!inner(order_index, levelup_metadata_uri),
    quests!inner(base_nft_template_id, clear_metadata_uri, quest_locations(id))
  `).limit(5);
  console.log(error || JSON.stringify(data, null, 2));
}
test();
