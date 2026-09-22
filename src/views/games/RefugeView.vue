<script setup lang="ts">
import RefugeGame from '@/components/refuge/RefugeGame.vue'
</script>

<template>
  <div class="refuge-page">
    <h1>Notre Refuge</h1>
    <p class="intro">
      Ramassez du bois et de la pierre en touchant les ressources sur la
      carte, puis rejoignez votre partenaire au chantier pour lever
      ensemble le premier mur de votre maison.
    </p>
    <RefugeGame />
  </div>
</template>

<style scoped>
.refuge-page {
  min-height: 100vh;
  padding: clamp(16px, 4vw, 32px) clamp(12px, 4vw, 20px) 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

h1 {
  font-size: clamp(26px, 7vw, 34px);
  letter-spacing: 2px;
  margin-bottom: 8px;
}

.intro {
  max-width: 480px;
  text-align: center;
  color: var(--color-text-muted);
  font-size: 14px;
  margin-bottom: 24px;
}
</style>
