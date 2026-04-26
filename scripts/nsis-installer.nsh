!macro customRemoveFiles
  ; 在删除旧文件前，先备份 data 目录到临时位置
  ${If} ${FileExists} "$INSTDIR\data\*.*"
    DetailPrint "检测到用户数据目录，正在保护..."
    RMDir /r "$TEMP\TMDB_Helper_Data_Backup"
    CreateDirectory "$TEMP\TMDB_Helper_Data_Backup"
    CopyFiles /SILENT "$INSTDIR\data\*.*" "$TEMP\TMDB_Helper_Data_Backup"
  ${EndIf}
!macroend

!macro customInstall
  ; 安装完成后，如果临时备份存在，恢复 data 目录
  ${If} ${FileExists} "$TEMP\TMDB_Helper_Data_Backup\*.*"
    DetailPrint "恢复用户数据..."
    CreateDirectory "$INSTDIR\data"
    CopyFiles /SILENT "$TEMP\TMDB_Helper_Data_Backup\*.*" "$INSTDIR\data"
    RMDir /r "$TEMP\TMDB_Helper_Data_Backup"
  ${EndIf}
!macroend
