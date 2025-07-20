// components/WhatsAppLink.jsx
import Link from 'next/link'
import { MessageCircle } from 'lucide-react'

const WhatsAppLink = () => {
  const whatsappLink = "https://chat.whatsapp.com/IUkmmj90ZGE8Icn9qxyL9E"
  
  return (
    <div className="flex justify-center items-center p-4">
      <Link 
        href={whatsappLink}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg transition-colors duration-300"
      >
        <MessageCircle size={24} />
        <span className="font-medium">Join Our WhatsApp Group</span>
      </Link>
    </div>
  )
}

export default WhatsAppLink