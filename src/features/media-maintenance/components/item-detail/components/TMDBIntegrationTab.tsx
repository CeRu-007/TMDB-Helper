"use client"

import { TabsContent } from "@/shared/components/ui/tabs"
import TMDBImportIntegrationDialog from "@/features/tmdb-import/components/tmdb-import-integration-dialog"
import { TMDBCommandList } from "./TMDBCommandList"
import type { TMDBItem } from "@/lib/data/storage"

interface TMDBCommand {
  type: "platform" | "tmdb"
  title: string
  command: string
  description: string
  icon: React.ReactNode
}

interface TMDBIntegrationTabProps {
  item: TMDBItem
  commands: TMDBCommand[]
  onUpdate: (item: TMDBItem) => void
  showCommands?: boolean
}

export function TMDBIntegrationTab({
  item,
  commands,
  onUpdate,
  showCommands = false
}: TMDBIntegrationTabProps) {
  return (
    <TabsContent value="integration" className="transition-opacity duration-300 ease-in-out flex-1 min-h-0">
      <div className="pr-2 w-full h-full min-w-0 max-w-full flex flex-col">
        {/* TMDB Import Integration Dialog */}
        <div className="flex-1 min-h-0">
          <TMDBImportIntegrationDialog
            open={true}
            onOpenChange={() => {}}
            item={item}
            onItemUpdate={onUpdate}
            inTab={true}
          />
        </div>

        {/* TMDB Commands List */}
        {showCommands && commands.length > 0 && (
          <div className="mt-4">
            <TMDBCommandList commands={commands} />
          </div>
        )}
      </div>
    </TabsContent>
  )
}