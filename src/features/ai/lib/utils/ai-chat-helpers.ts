export const getTimeBasedGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return '早上好';
  } else if (hour >= 12 && hour < 18) {
    return '中午好';
  } else {
    return '晚上好';
  }
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

export const formatChatDate = (date: Date): string => {
  return date.toLocaleDateString('zh-CN', { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const cleanSuggestion = (suggestion: string): string => {
  let cleaned = suggestion.trim();
  cleaned = cleaned.replace(/^[\d\-•*]\s*/, '');
  if (cleaned.length > 25) {
    cleaned = cleaned.substring(0, 22) + '...';
  }
  return cleaned;
};

export const validateSuggestions = (suggestions: unknown[]): string[] => {
  if (!Array.isArray(suggestions) || suggestions.length === 0) {
    return [];
  }

  return suggestions
    .map(s => {
      if (typeof s === 'string') {
        return cleanSuggestion(s);
      }
      return '';
    })
    .filter(s => s.length > 0)
    .slice(0, 3);
};
