import { Button } from "@/shared/components/ui/button"
import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-6">
        <h1 className="text-6xl font-bold text-foreground">404</h1>
        <h2 className="text-2xl font-semibold text-muted-foreground">页面未找到</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          抱歉，您访问的页面不存在或已被移除。
        </p>
        <Link href="/">
          <Button size="lg">
            返回首页
          </Button>
        </Link>
      </div>
    </div>
  )
}