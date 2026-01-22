<script lang="ts">
  import { toast } from '@zerodevx/svelte-toast';

  import type { ArkGridAttr } from '../lib/constants/enums';
  import {
    type ArkGridGemOption,
    ArkGridGemOptionTypes,
  } from '../lib/models/arkGridGems';
  import { addGem } from '../lib/state/profile.state.svelte';

  type Props = {
    gemAttr: ArkGridAttr;
  };
  let { gemAttr }: Props = $props();

  let dialog: HTMLDialogElement;

  function open() {
    dialog.showModal();
  }

  function close() {
    dialog.close();
  }
  function confirm() {
    if (
      willPower < 3 ||
      willPower > 10 ||
      corePoint < 1 ||
      corePoint > 5 ||
      optionA.value < 1 ||
      optionA.value > 5 ||
      optionB.value < 1 ||
      optionB.value > 5
    ) {
      window.alert('Invalid gem!');
    }
    addGem(
      JSON.parse(
        JSON.stringify({
          gemAttr,
          req: willPower,
          point: corePoint,
          option1: optionA,
          option2: optionB,
        })
      )
    );
    dialog.close();
    toast.push('젬 추가 완료');
  }
  let optionA = $state<ArkGridGemOption>({
    optionType: ArkGridGemOptionTypes.ATTACK,
    value: 1,
  });
  let optionB = $state<ArkGridGemOption>({
    optionType: ArkGridGemOptionTypes.BOSS_DAMAGE,
    value: 1,
  });
  let willPower = $state(3);
  let corePoint = $state(5);
</script>

<button onclick={open}>젬 추가</button>
<dialog bind:this={dialog}>
  <div class="root">
    <div class="title">젬 추가</div>
    <div class="content">
      <label
        >의지력:
        <input bind:value={willPower} type="number" min="3" max="9" />
      </label>
      <label
        >포인트:
        <input bind:value={corePoint} type="number" min="1" max="5" />
      </label>
      {#each [{ gemOption: optionA, otherOption: optionB }, { gemOption: optionB, otherOption: optionA }] as { gemOption, otherOption }}
        <div class="row">
          <label>
            젬 옵션
            <select bind:value={gemOption.optionType}>
              {#each Object.values(ArkGridGemOptionTypes) as option}
                <option
                  value={option}
                  disabled={option === otherOption.optionType}>{option}</option
                >
              {/each}
            </select>
            <input bind:value={gemOption.value} type="number" min="1" max="5" />
          </label>
        </div>
      {/each}
    </div>

    <div class="buttons">
      <button onclick={close}>취소</button>
      <button onclick={confirm}>확인</button>
    </div>
  </div>
</dialog>

<style>
  .root {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .content {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    gap: 1rem;
  }
  .title {
    font-size: 1.4rem;
    font-weight: 500;
    text-align: center;
  }
  .row {
    display: flex;
    gap: 1rem;
    justify-content: center;
  }
  input {
    width: 2rem;
  }
  .buttons {
    display: flex;
    gap: 1rem;
    justify-content: center;
  }

  dialog::backdrop {
    background: rgba(0, 0, 0, 0.5);
  }

  dialog {
    border-radius: 8px;
    border: 1px var(--border) solid;
  }
</style>
