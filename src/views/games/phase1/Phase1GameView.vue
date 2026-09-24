<script setup lang="ts">
import { computed, type Component } from 'vue'
import { useRoute } from 'vue-router'
import type { Phase1GameId } from '@/games/phase1/catalog'
import AssociationExpress from '@/components/phase1/games/AssociationExpress.vue'
import LEscalier from '@/components/phase1/games/LEscalier.vue'
import EtToi from '@/components/phase1/games/EtToi.vue'
import LePartage from '@/components/phase1/games/LePartage.vue'
import PasDeReponse from '@/components/phase1/games/PasDeReponse.vue'
import SousPression from '@/components/phase1/games/SousPression.vue'
import TuPreferes from '@/components/phase1/games/TuPreferes.vue'

const GAMES: Record<Phase1GameId, Component> = {
  'pas-de-reponse': PasDeReponse,
  'tu-preferes': TuPreferes,
  'sous-pression': SousPression,
  'le-partage': LePartage,
  'association-express': AssociationExpress,
  'et-toi': EtToi,
  escalier: LEscalier,
}

const route = useRoute()
const gameComponent = computed(() => GAMES[route.params.id as Phase1GameId] ?? null)
</script>

<template>
  <component :is="gameComponent" v-if="gameComponent" :key="String(route.params.id)" />
  <main v-else class="missing">
    <p>Ce jeu n'existe pas.</p>
    <RouterLink to="/jeux/phase1">Voir les jeux de phase 1</RouterLink>
  </main>
</template>

<style scoped>
.missing {
  padding: 40px 16px;
  text-align: center;
}
</style>
