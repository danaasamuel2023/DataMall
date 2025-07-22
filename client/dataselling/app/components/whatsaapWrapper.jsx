// components/WhatsAppLink.jsx
import Link from 'next/link'
import { MessageCircle } from 'lucide-react'

const WhatsAppLink = () => {
  const whatsappLink = "https://chat.whatsapp.com/HWtr2JohLxSJfEtIb3pn4t?mode=ac_c"
  
  return (
    <div className="fixed right-6 bottom-6 z-50">
      <Link 
        href={whatsappLink}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110"
      >
        {/* Circular button for mobile */}
        <div className="flex items-center justify-center w-14 h-14 md:w-auto md:h-auto md:px-6 md:py-3 md:rounded-lg">
          <MessageCircle size={24} />
          <span className="hidden md:inline-block md:ml-2 font-medium">Join Our WhatsApp Group</span>
        </div>
      </Link>
      
      {/* Tooltip for mobile */}
      <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-sm py-1 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap md:hidden">
        Join Our WhatsApp Group
      </div>
    </div>
  )
}

export default WhatsAppLink