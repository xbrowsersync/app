import UIKit
import Social
import MobileCoreServices

class ShareViewController: UIViewController {
    override func viewDidLoad() {
        var urlFound = false
        
        for item in self.extensionContext!.inputItems {
            let inputItem = item as! NSExtensionItem
            for provider in inputItem.attachments! {
                let itemProvider = provider as! NSItemProvider
                
                if itemProvider.hasItemConformingToTypeIdentifier(kUTTypeURL as String) {
                    itemProvider.loadItem(forTypeIdentifier: kUTTypeURL as String, options: nil, completionHandler: {
                        (value, error) in
                        if urlFound {
                            return
                        }
                        
                        let url = value as! URL
                        self.openXBrowserSyncWithSharedUrl(sharedUrl: url.absoluteString)
                        urlFound = true
                    })
                }
                else if itemProvider.hasItemConformingToTypeIdentifier(kUTTypeText as String) {
                    itemProvider.loadItem(forTypeIdentifier: kUTTypeText as String, options: nil, completionHandler: {
                        (value, error) in
                        if urlFound {
                            return
                        }
                        
                        if value is String {
                            let url = self.extractUrlFromText(text: value as! String)
                            
                            if url != "" {
                                self.openXBrowserSyncWithSharedUrl(sharedUrl: url)
                                urlFound = true
                            }
                        }
                    })
                }
            }
        }
        
        self.extensionContext!.completeRequest(returningItems: [], completionHandler: nil)
    }
    
    func openXBrowserSyncWithSharedUrl(sharedUrl: String) {
        NSLog("%@", "Shared url is \(sharedUrl)")
        
        let allowedCharacterSet = (CharacterSet(charactersIn: "!*'();:@&=+$,/?%#[] ").inverted)
        let escapedUrl = sharedUrl.addingPercentEncoding(withAllowedCharacters: allowedCharacterSet)
        let urlAsString = "xbrowsersync://bookmarks/current?url=" + escapedUrl!
        let url = URL(string: urlAsString)
        
        let context = NSExtensionContext()
        context.open(url!, completionHandler: nil)
        
        var responder = self as UIResponder?
        while (responder != nil){
            if responder?.responds(to: Selector("openURL:")) == true {
                responder?.perform(Selector("openURL:"), with: url)
            }
            responder = responder!.next
        }
    }
    
    func extractUrlFromText(text: String) -> String {
        let linkRegexPattern = "(\\w+://)?(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]+\\.[a-z]+\\b([-a-zA-Z0-9@:%_\\+.~#?&//=]*)"
        let linkRegex = try! NSRegularExpression(pattern: linkRegexPattern, options: .caseInsensitive)
        let matches = linkRegex.matches(in: text, range: NSMakeRange(0, text.utf16.count))
        
        let links = matches.map { result -> String in
            let hrefRange = result.rangeAt(0)
            let start = String.UTF16Index(hrefRange.location)
            let end = String.UTF16Index(hrefRange.location + hrefRange.length)
            
            return String(text.utf16[start..<end])!
        }
        
        if links.count > 0 {
            return links[0]
        }
        
        return ""
    }
}
