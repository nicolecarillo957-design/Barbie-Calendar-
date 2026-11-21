import { supabase } from '../supabaseClient'

export interface ChatMessage {
  id?: string
  sender_email: string
  sender_name: string
  recipient_email: string
  text: string
  category?: 'feedback' | 'idea' | 'praise' | 'bug'
  created_at?: string
}

export async function sendChatMessage(msg: Omit<ChatMessage, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      sender_email: msg.sender_email.toLowerCase(),
      sender_name: msg.sender_name,
      recipient_email: msg.recipient_email.toLowerCase(),
      text: msg.text,
      category: msg.category || 'feedback'
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export function subscribeToChat(
  userEmail: string,
  otherEmail: string,
  onUpdate: (messages: ChatMessage[]) => void
) {
  const u1 = userEmail.toLowerCase()
  const u2 = otherEmail.toLowerCase()

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_email.eq.${u1},recipient_email.eq.${u2}),and(sender_email.eq.${u2},recipient_email.eq.${u1})`)
      .order('created_at', { ascending: true })

    if (!error && data) onUpdate(data)
  }

  fetchMessages()

  const channel = supabase
    .channel(`chat:${u1}:${u2}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'messages' },
      () => fetchMessages()
    )
    .subscribe()

  return () => supabase.removeChannel(channel)
}
