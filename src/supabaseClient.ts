import { createClient } from '@supabase/supabase-js'
const supabaseUrl = 'https://ufwcpphiqlyqqfoutzdu.supabase.com'
const supabaseAnonKey = 'sb_publishable_KTb0xn4spfA2UxjcUVyAeg_WjOb6265'
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
