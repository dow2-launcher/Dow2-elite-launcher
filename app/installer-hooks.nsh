; Elite Launcher installer additions (included by Tauri's installer.nsi before its pages).
; The launcher must not be installed into the Dawn of War II folder: files of the launcher there break the game
; (crash near the end of a match load was reported with the portable build in the game folder).

!define MUI_DIRECTORYPAGE_TEXT_TOP "Установите лаунчер в любую папку, но НЕ в папку с Dawn of War II (там, где DOW2.exe) — иначе игра может падать. Папку игры лаунчер найдёт сам.$\r$\n$\r$\nInstall the launcher anywhere EXCEPT the Dawn of War II folder (where DOW2.exe is) - the game may crash otherwise. The launcher finds the game by itself."

; Next is disabled while the chosen folder is the game folder or inside it
Function .onVerifyInstDir
  IfFileExists "$INSTDIR\DOW2.exe" bad
  IfFileExists "$INSTDIR\..\DOW2.exe" bad
  IfFileExists "$INSTDIR\..\..\DOW2.exe" bad
  Return
  bad:
    Abort
FunctionEnd

; Before Tauri's own "is the app running" check (CheckIfAppIsRunning, right after this hook) wait until nothing holds the
; launcher exe any more. That check asks Restart Manager who uses the exe and, if anyone does, force-closes them all; when
; one of them can not be closed it gives up with "failed to close Elite Launcher". On a self-update this happens a lot:
; - the launcher starts this installer and exits, the check runs ~0.2 s later, often before the exit is complete;
; - antivirus (McAfee Framework Host here) keeps the exe open for ~1 s after the process ends; it is a critical process,
;   Restart Manager refuses to touch it and then closes nothing at all;
; - a second launcher hidden in the tray (older versions allow several copies) never exits by itself.
; So: wait up to 15 s for the exe to be free; on an update also close copies still running after 3 s (all of them are
; this user's launchers, the game is checked to be closed before the update starts).
!macro EliteExeHolders   ; $R7 = 1 while someone holds the launcher exe, 0 when it is free (or Restart Manager failed)
  StrCpy $R7 0
  !insertmacro RestartManager_StartSession $R5   ; macros of Win\RestartManager.nsh, included by installer.nsi
  ${If} $R5 != ""
    !insertmacro RestartManager_RegisterFile $R5 "$INSTDIR\${MAINBINARYNAME}.exe"
    ${If} $0 = 0
      System::Call 'RSTRTMGR::RmGetList(i R5, *i .r1, *i .r2, p 0, *i .r3) i .r0'
      ${IfThen} $0 = 234 ${|} StrCpy $R7 1 ${|}   ; ERROR_MORE_DATA: there are holders
    ${EndIf}
    !insertmacro RestartManager_EndSession $R5
  ${EndIf}
!macroend

!macro NSIS_HOOK_PREINSTALL
  ${If} ${FileExists} "$INSTDIR\${MAINBINARYNAME}.exe"
    StrCpy $R9 0   ; 250 ms steps
    elite_wait_exe:
      !insertmacro EliteExeHolders
      ${If} $R7 = 1
      ${AndIf} $R9 < 60
        ${If} $UpdateMode = 1
        ${AndIf} $R9 = 12
          ReadEnvStr $R8 USERNAME
          nsExec::Exec '"$SYSDIR\taskkill.exe" /F /IM "${MAINBINARYNAME}.exe" /FI "USERNAME eq $R8"'
          Pop $R8
        ${EndIf}
        Sleep 250
        IntOp $R9 $R9 + 1
        Goto elite_wait_exe
      ${EndIf}
  ${EndIf}
!macroend

; 1.6.3: the launcher's new icon (1.5.12) did not show after an update - the exe has it, but Explorer draws the shortcuts (desktop,
; Start menu, the pinned taskbar button) from its icon cache, kept by the exe's path, and an update writes the same path. After the
; files are in place: tell Explorer the icons changed (SHCNE_ASSOCCHANGED) and have it re-read its icon cache (ie4uinit -show,
; Windows 10/11; the 64-bit one through Sysnative when this installer runs as a 32-bit process).
!macro NSIS_HOOK_POSTINSTALL
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
  ${If} ${FileExists} "$WINDIR\Sysnative\ie4uinit.exe"
    nsExec::Exec '"$WINDIR\Sysnative\ie4uinit.exe" -show'
    Pop $R8
  ${ElseIf} ${FileExists} "$SYSDIR\ie4uinit.exe"
    nsExec::Exec '"$SYSDIR\ie4uinit.exe" -show'
    Pop $R8
  ${EndIf}
!macroend
