export class EpisodeConfigClient {
  static async saveConfig(json: string): Promise<void> {
    try {
      await fetch('/api/system/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set', key: 'episode_generator_config', value: json })
      })
    } catch (e) {

    }
  }
}
