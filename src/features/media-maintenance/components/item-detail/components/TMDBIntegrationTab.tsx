"use client"

import { TabsContent } from "@/shared/components/ui/tabs"
import TMDBImportIntegrationDialog from "@/features/tmdb-import/components/tmdb-import-integration-dialog"
import type { TMDBItem } from "@/lib/data/storage"

interface TMDBIntegrationTabProps {
  item: TMDBItem
  onUpdate: (item: TMDBItem) => void
}

export function TMDBIntegrationTab({
  item,
  onUpdate
}: TMDBIntegrationTabProps) {
  return (
    <TabsContent value="integration" className="transition-opacity duration-300 ease-in-out flex-1 min-h-0">
      <div className="pr-2 w-full h-full min-w-0 max-w-full flex flex-col">
        <div className="flex-1 min-h-0">
          <TMDBImportIntegrationDialog
            open={true}
            onOpenChange={() => {}}
            item={item}
            onItemUpdate={onUpdate}
            inTab={true}
          />
        </div>
      </div>
    </TabsContent>
  )
}