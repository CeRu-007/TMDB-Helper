export class EpisodeConfigClient {
  static async saveConfig(json: string): Promise<void> {
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'episode_generator_config', value: json })
      })
    } catch (e) {
      
    }
  }
}
