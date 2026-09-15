; whatsapp_autosender.ahk
#NoEnv
SetWorkingDir %A_ScriptDir%

; Press F9 to trigger the auto-sending process
F9::
    ClipData := Clipboard
    
    ; 1) Check for personalized dynamic messages (New Guardian WhatsApp Feature)
    if InStr(ClipData, "WHATSAPP_DYNAMIC|||") {
        ; Remove the identifier prefix
        StringReplace, CleanData, ClipData, WHATSAPP_DYNAMIC|||, , All
        
        ; Split by ||| to get each phone~~~message pair
        PairsArray := StrSplit(CleanData, "|||")
        
        for index, Pair in PairsArray
        {
            if (Pair = "")
                continue
                
            PairParts := StrSplit(Pair, "~~~")
            Phone := PairParts[1]
            Message := PairParts[2]
            
            if (Phone = "" or Message = "")
                continue
                
            ; Refocus search box for subsequent entries
            if (index > 1) {
                Send, ^!/
                Sleep, 800
            }
            
            ; Clear search box
            Send, ^a
            Sleep, 100
            Send, {Backspace}
            Sleep, 100
            
            ; Type phone
            SendRaw, %Phone%
            
            ; Wait for WhatsApp directory search
            Sleep, 2500
            
            ; Select contact
            Send, {Enter}
            Sleep, 1500
            
            ; Paste the specific message
            Clipboard := Message
            Send, ^v
            Sleep, 500
            
            ; Send message
            Send, {Enter}
            Sleep, 1000
        }
        
        Clipboard := ClipData
        MsgBox, Finished sending all personalized messages!
        return
    }
    
    ; 2) Check for standard bulk messages (Assignments, Surveys, etc.)
    if InStr(ClipData, "WHATSAPP_BULK|||") {
        parts := StrSplit(ClipData, "|||")
        
        Message := parts[2]
        PhonesStr := parts[3]
        PhonesArray := StrSplit(PhonesStr, ",")
        
        for index, Phone in PhonesArray
        {
            if (Phone = "")
                continue
                
            if (index > 1) {
                Send, ^!/
                Sleep, 800
            }
            
            Send, ^a
            Sleep, 100
            Send, {Backspace}
            Sleep, 100
            
            SendRaw, %Phone%
            Sleep, 2500
            
            Send, {Enter}
            Sleep, 1500
            
            Clipboard := Message
            Send, ^v
            Sleep, 500
            
            Send, {Enter}
            Sleep, 1000
        }
        
        Clipboard := ClipData
        MsgBox, Finished sending all bulk messages!
        return
    }
    
    ; If neither format is found
    MsgBox, Please copy the data from the website first using the 'Copy for WhatsApp Auto-Sender' button.
return