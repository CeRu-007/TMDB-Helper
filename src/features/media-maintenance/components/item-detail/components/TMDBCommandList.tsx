"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import { Terminal, Link, Copy } from "lucide-react"
import { toast } from "@/shared/components/ui/use-toast"

interface TMDBCommand {
  type: "platform" | "tmdb"
  title: string
  command: string
  description: string
  icon: React.ReactNode
}

interface TMDBCommandListProps {
  commands: TMDBCommand[]
}

export function TMDBCommandList({
  commands
}: TMDBCommandListProps) {
  const handleCopyCommand = (command: string, title: string) => {
    navigator.clipboard.writeText(command)
    toast({
      title: "命令已复制",
      description: `${title} 命令已复制到剪贴板`,
    })
  }

  if (commands.length === 0) {
    return null
  }

  return (
    <Card variant="frosted">
      <CardHeader>
        <CardTitle className="text-base flex items-center">
          <Terminal className="h-4 w-4 mr-2" />
          TMDB命令
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {commands.map((cmd, index) => (
            <div key={index} className="p-3 bg-background/20 rounded-lg border border-border/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {cmd.icon}
                  <span className="font-medium text-sm">{cmd.title}</span>
                  <Badge variant="outline" className="text-xs">
                    {cmd.type}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopyCommand(cmd.command, cmd.title)}
                  className="h-6 w-6 p-0"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mb-2">{cmd.description}</p>
              <div className="bg-black/80 text-green-400 p-2 rounded text-xs font-mono break-all">
                {cmd.command}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}