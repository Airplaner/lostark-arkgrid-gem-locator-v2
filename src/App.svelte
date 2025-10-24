<script lang="ts">
  import ArkgridGemAddPanel from './components/ArkGridGemAddPanel.svelte';
  import ArkGridGemList from './components/ArkGridGemList.svelte';
  import ArkGridCoreEditPanel from './components/ArkGridCoreEditPanel.svelte';
  import Modal from './components/Modal.svelte';
  import { openAPIConfig } from './stores/store';

  let showModalEditJWT = $state(false);
</script>

<main>
  <h1>AGL</h1>
  <button onclick={() => (showModalEditJWT = true)}>Open API 토큰 관리</button>
  <ArkgridGemAddPanel />
  <ArkGridGemList></ArkGridGemList>
  <ArkGridCoreEditPanel></ArkGridCoreEditPanel>

  <Modal bind:showModal={showModalEditJWT}>
    {#snippet header()}
      <h2>토큰 관리</h2>
    {/snippet}
    {#snippet children()}
      <label>
        <span>JWT: </span>
        <input bind:value={$openAPIConfig.jwt} />
      </label>
      <br>
      <label>
        <span>캐릭터명: </span>
        <input bind:value={$openAPIConfig.charname} />
      </label>
    {/snippet}
  </Modal>
</main>
