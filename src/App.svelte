<script lang="ts">
  import AppConfiguration from './components/AppConfiguration.svelte';
  import ArkGridCoreEditPanel from './components/ArkGridCoreEditPanel.svelte';
  import ArkgridGemAddPanel from './components/ArkGridGemAddPanel.svelte';
  import ArkGridGemList from './components/ArkGridGemList.svelte';
</script>

<main>
  <h1>아크그리드 젬 배치기</h1>
  <AppConfiguration></AppConfiguration>
  <ArkgridGemAddPanel />
  <ArkGridGemList></ArkGridGemList>
  <ArkGridCoreEditPanel></ArkGridCoreEditPanel>
</main>
