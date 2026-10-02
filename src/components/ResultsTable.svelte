<script lang="ts">
  import { formatFixed, formatScientific } from '../lib/format';
  import type { ResultRow } from '../lib/types';

  let {
    rows,
    selectedId,
    onSelect,
  }: { rows: ResultRow[]; selectedId: string; onSelect: (id: string) => void } = $props();

  const k = (v: number, d: number) => formatFixed(v / 1e3, d);
  const range = (r: ResultRow) => `${k(r.rangeLo, 1)}–${k(r.rangeHi, 1)}`;
</script>

<div class="res-box">
  <div class="res-wrap">
    <table class="res">
      <thead>
        <tr>
          <th>Sample</th>
          <th class="hp">
            ν̃<sub>peak</sub> ·10<sup>−3</sup>
            <button type="button" class="tip" aria-label="About ν̃ peak"
              ><b>i</b><span>Where the tallest absorption peak sits, as a wavenumber.</span></button
            >
          </th>
          <th class="hp">
            ε<sub>max</sub> ·10<sup>−3</sup>
            <button type="button" class="tip" aria-label="About ε max"
              ><b>i</b><span>How strongly the sample absorbs light at its peak.</span></button
            >
          </th>
          <th class="hp">
            ν̃<sub>range</sub> ·10<sup>−3</sup>
            <button type="button" class="tip" aria-label="About the range"
              ><b>i</b><span>The part of the spectrum included in the calculation.</span></button
            >
          </th>
          <th class="hp">
            ∫ε/ν̃ dν̃ ·10<sup>−3</sup>
            <button type="button" class="tip r" aria-label="About the area"
              ><b>i</b><span
                >The area under the absorption band, weighted by 1/ν̃. The main input to B₁₂.</span
              ></button
            >
          </th>
          <th class="hp">
            B<sub>12</sub>
            <button type="button" class="tip r" aria-label="About B12"
              ><b>i</b><span
                >Einstein absorption coefficient. How likely the molecule is to absorb a photon.</span
              ></button
            >
          </th>
          <th class="hp">
            μ
            <button type="button" class="tip r" aria-label="About mu"
              ><b>i</b><span>Transition dipole moment. How strongly light couples to the molecule.</span></button
            >
          </th>
          <th class="hp">
            f<sub>12</sub>
            <button type="button" class="tip r" aria-label="About f12"
              ><b>i</b><span>Oscillator strength. A dimensionless measure of how strong the transition is.</span></button
            >
          </th>
        </tr>
        <tr class="units">
          <th></th>
          <th>1/cm</th>
          <th>L·mol⁻¹·cm⁻¹</th>
          <th>1/cm – 1/cm</th>
          <th>L·mol⁻¹·cm⁻¹</th>
          <th>cm³·J⁻¹·s⁻²</th>
          <th>D</th>
          <th>N/A</th>
        </tr>
      </thead>
      <tbody>
        {#each rows as r (r.id)}
          <tr
            class:sel={r.id === selectedId}
            style="--c:{r.color}"
            tabindex="0"
            onclick={() => onSelect(r.id)}
            onkeydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(r.id);
              }
            }}
          >
            <td class="s"><i class="dotc"></i>{r.id}<small>{r.solvent}</small></td>
            <td>{k(r.peakWavenumber, 2)}</td>
            <td>{k(r.epsMax, 1)}</td>
            <td>{range(r)}</td>
            <td>{k(r.integralOverNu, 2)}</td>
            <td class="key">{formatScientific(r.b12, 4)}</td>
            <td class="key">{formatScientific(r.mu, 4)}</td>
            <td class="key">{formatFixed(r.f12, 2)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <div class="res-cards">
    {#each rows as r (r.id)}
      <div
        class="rc"
        class:sel={r.id === selectedId}
        style="--c:{r.color}"
        role="button"
        tabindex="0"
        onclick={() => onSelect(r.id)}
        onkeydown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(r.id);
          }
        }}
      >
        <div class="rc-h"><i class="dotc"></i><b>{r.id}</b><span>{r.solvent}</span></div>
        <dl class="kv">
          <div class="key"><dt>B₁₂ (cm³·J⁻¹·s⁻²)</dt><dd>{formatScientific(r.b12, 4)}</dd></div>
          <div class="key"><dt>μ (D)</dt><dd>{formatScientific(r.mu, 4)}</dd></div>
          <div class="key"><dt>f₁₂</dt><dd>{formatFixed(r.f12, 2)}</dd></div>
          <div><dt>∫ε/ν̃ dν̃ ·10⁻³</dt><dd>{k(r.integralOverNu, 2)}</dd></div>
          <div><dt>ν̃ peak ·10⁻³ (1/cm)</dt><dd>{k(r.peakWavenumber, 2)}</dd></div>
          <div><dt>ε max ·10⁻³</dt><dd>{k(r.epsMax, 1)}</dd></div>
          <div><dt>ν̃ range ·10⁻³</dt><dd>{range(r)}</dd></div>
        </dl>
      </div>
    {/each}
  </div>
</div>
