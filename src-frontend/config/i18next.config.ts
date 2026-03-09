export default {
  locales: [
    "en",
    "zh_CN"
  ],
  extract: {
    input: "src/**/*.{js,jsx,ts,tsx}",
    output: "src/i18n/locales/{{language}}/{{namespace}}.json",
  }
}
