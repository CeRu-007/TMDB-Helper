import React from "react"
import { useTranslation } from "react-i18next"
import { TableHead } from "@/shared/components/ui/table"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import {
  Plus,
  MoreHorizontal,
  ArrowLeft,
  ArrowRight,
  Copy,
  Trash2,
} from "lucide-react"

interface HeaderRendererProps {
  headers: string[]
  showColumnOperations: boolean
  onInsertColumn: (index: number, position: "before" | "after") => void
  onDeleteColumn: (index: number) => void
  onDuplicateColumn: (index: number) => void
  onMoveColumn: (index: number, direction: "left" | "right") => void
}

export const HeaderRenderer: React.FC<HeaderRendererProps> = ({
  headers,
  showColumnOperations,
  onInsertColumn,
  onDeleteColumn,
  onDuplicateColumn,
  onMoveColumn,
}) => {
  const { t: tMedia } = useTranslation('media')
  const m = (key: string) => tMedia(`csvEditor.${key}`)

  return (
    <>
      {headers.map((header, index) => (
        <TableHead key={index} className="relative group">
          <div className="flex items-center justify-between">
            <span className="font-medium">{header}</span>
            {showColumnOperations && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={() => onInsertColumn(index, "before")}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {m('insertColumnLeft')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onInsertColumn(index, "after")}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {m('insertColumnRight')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDuplicateColumn(index)}>
                    <Copy className="mr-2 h-4 w-4" />
                    {m('copyColumn')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onMoveColumn(index, "left")}
                    disabled={index === 0}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {m('moveLeft')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onMoveColumn(index, "right")}
                    disabled={index === headers.length - 1}
                  >
                    <ArrowRight className="mr-2 h-4 w-4" />
                    {m('moveRight')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDeleteColumn(index)}
                    disabled={headers.length <= 1}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {m('deleteColumn')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </TableHead>
      ))}
    </>
  )
}

export default HeaderRenderer
