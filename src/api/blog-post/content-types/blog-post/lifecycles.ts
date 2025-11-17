const WORDS_PER_MINUTE = 180;

const stripHtml = (value?: string | null) =>
  value?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() ?? '';

const computeReadTime = (content?: string | null) => {
  const wordCount = stripHtml(content).split(' ').filter(Boolean).length;
  return Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));
};

export default {
  beforeCreate(event) {
    if (!event.params.data) {
      return;
    }

    if (!event.params.data.readTime && event.params.data.content) {
      event.params.data.readTime = computeReadTime(event.params.data.content);
    }
  },
  beforeUpdate(event) {
    if (!event.params.data) {
      return;
    }

    const contentUpdated = event.params.data.content;
    if (contentUpdated) {
      event.params.data.readTime = computeReadTime(contentUpdated);
    }
  },
};

