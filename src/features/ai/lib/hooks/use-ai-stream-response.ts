import { useCallback } from 'react'
import { flushSync } from 'react-dom'
import { Message } from '@/types/ai-chat'

export const useAiStreamResponse = () => {
  const processStream = useCallback(async (
    response: Response,
    messageId: string,
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
    scrollToLatestMessage: () => void
  ) => {
    if (!response.body) throw new Error('Response body is null');
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let assistantAccumulated = '';
    let lineBuffer = '';
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        lineBuffer += chunk;

        const lines = lineBuffer.split('\n');
        lineBuffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;
          
          if (!trimmed.startsWith('data:')) continue;

          const dataStr = trimmed.slice(5).trim();
          if (dataStr === '[DONE]') continue;

          try {
            const parsed = JSON.parse(dataStr);
            const delta = parsed?.choices?.[0]?.delta;
            if (delta?.content) {
              assistantAccumulated += delta.content;
              buffer += delta.content;
              
              if (buffer.length >= 2) {
                flushSync(() => {
                  setMessages(prev => prev.map(m =>
                    m.id === messageId
                      ? { ...m, content: assistantAccumulated, isStreaming: true }
                      : m
                  ));
                });
                buffer = '';
                scrollToLatestMessage();
              }
            }
          } catch (e) {
            console.warn('SSE解析失败，跳过此行:', dataStr.substring(0, 100));
          }
        }
      }
      
      if (buffer.length > 0) {
        flushSync(() => {
          setMessages(prev => prev.map(m =>
            m.id === messageId
              ? { ...m, content: assistantAccumulated, isStreaming: true }
              : m
          ));
        });
      }
      
      return assistantAccumulated;
    } finally {
      try { 
        if (reader.locked) {
          reader.releaseLock(); 
        }
      } catch {}
    }
  }, []);

  return { processStream };
};
