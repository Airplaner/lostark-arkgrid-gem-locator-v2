<script lang="ts">
  import { addGem, ArkGridGemAttr } from '../stores/arkgridGems';

  let gemAttr: ArkGridGemAttr = ArkGridGemAttr.Order;
  let name: string = '테스트젬';

  // 라디오 버튼 항목과 범위 정의
  type IntegerInputDef = {
    name: string;
    label: string;
    min: number;
    max: number;
  };
  const integerInputs: IntegerInputDef[] = [
    { name: 'req', label: '필요 의지력', min: 3, max: 6 },
    { name: 'point', label: '활성 포인트', min: 1, max: 5 },
    { name: 'attack', label: '공격력', min: 0, max: 5 },
    { name: 'skillDamage', label: '추가 피해', min: 0, max: 5 },
    { name: 'bossDamage', label: '보스 피해', min: 0, max: 5 },
    { name: 'partyDamage', label: '아군 피해량 강화', min: 0, max: 5 },
    { name: 'partyAttack', label: '아군 공격력 강화', min: 0, max: 5 },
    { name: 'stigma', label: '낙인력', min: 0, max: 5 },
  ];

  let values: Record<string, number> = {};
  integerInputs.forEach((f) => (values[f.name] = f.min));

  function handleAdd() {
    if (!name) return;
    addGem(name, gemAttr, values['req'], values['point']);
    integerInputs.forEach((f) => (values[f.name] = f.min));
  }
</script>

<div class="panel">
  <div class="row">
    <span class="title">이름</span>
    <input placeholder="Name" bind:value={name}/>
  </div>
  <div class="row">
    <span class="title">젬 타입</span>
    <label>
      <input type="radio" name="gemAttr" bind:group={gemAttr} value={ArkGridGemAttr.Order} />
      질서
    </label>
    <label>
      <input type="radio" name="gemAttr" bind:group={gemAttr} value={ArkGridGemAttr.Chaos} />
      혼돈
    </label>
  </div>

  {#each integerInputs as integerInput}
    <div class="row">
      <span class="title">{integerInput.label}</span>
      {#each Array(integerInput.max - integerInput.min + 1) as _, i}
        <label>
          <input
            type="radio"
            name={integerInput.name}
            bind:group={values[integerInput.name]}
            value={integerInput.min + i}
          />
          {integerInput.min + i}
          {#if i != integerInput.max - integerInput.min}
            -
          {/if}
        </label>
      {/each}
    </div>
  {/each}

  <button on:click={handleAdd}>Add</button>
</div>

<style>
</style>
