import RobustCSVProcessor from '@/components/robust-csv-processor'

export default function TestCSVPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">CSV处理测试</h1>
        <RobustCSVProcessor />
      </div>
    </div>
  )
}