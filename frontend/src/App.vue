<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()

function changeLocale(lang: string) {
  locale.value = lang
  localStorage.setItem('locale', lang)
}
</script>

<template>
  <div class="app">
    <!-- TODO: Replace with actual layout -->
    <header class="header">
      <h1>{{ t('app.title') }}</h1>
      <div class="language-switcher">
        <button @click="changeLocale('en')" :class="{ active: locale === 'en' }">EN</button>
        <button @click="changeLocale('nl')" :class="{ active: locale === 'nl' }">NL</button>
        <button @click="changeLocale('es')" :class="{ active: locale === 'es' }">ES</button>
      </div>
    </header>
    <main>
      <router-view />
    </main>
  </div>
</template>

<style>
:root {
  --color-magenta: #CC0E70;
  --color-navy: #004A91;
  --color-white: #FFFFFF;
  --color-gray-100: #F5F5F5;
  --color-gray-200: #E0E0E0;
  --color-gray-600: #666666;
  --color-gray-900: #1A1A1A;

  /* 9-Grid colors */
  --color-grid-red: #DC2626;
  --color-grid-orange: #F59E0B;
  --color-grid-green: #22C55E;
  --color-grid-dark-green: #15803D;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: Tahoma, Verdana, Segoe, sans-serif;
  background-color: var(--color-gray-100);
  color: var(--color-gray-900);
}

.app {
  min-height: 100vh;
}

.header {
  background-color: var(--color-navy);
  color: var(--color-white);
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header h1 {
  margin: 0;
  font-size: 1.25rem;
}

.language-switcher button {
  background: transparent;
  border: 1px solid var(--color-white);
  color: var(--color-white);
  padding: 0.25rem 0.5rem;
  margin-left: 0.25rem;
  cursor: pointer;
  font-family: inherit;
}

.language-switcher button.active {
  background: var(--color-magenta);
  border-color: var(--color-magenta);
}

.language-switcher button:hover {
  background: var(--color-magenta);
  border-color: var(--color-magenta);
}

main {
  padding: 1rem;
}
</style>
