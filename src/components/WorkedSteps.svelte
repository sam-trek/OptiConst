<script lang="ts">
  import type { AbsorptionSampleResult, SampleScale } from '../lib/calculations/absorption';
  import { formatEnotation, formatFixed, formatThousands } from '../lib/format';

  let {
    id,
    result,
    scale,
    rangeNm,
    refractiveIndex,
  }: {
    id: string;
    result: AbsorptionSampleResult;
    scale: SampleScale;
    rangeNm: [number, number];
    refractiveIndex: number;
  } = $props();

  const lo = $derived(Math.min(...rangeNm));
  const hi = $derived(Math.max(...rangeNm));
  const nuLo = $derived(formatFixed(result.rangeWavenumber[0] / 1e3, 2));
  const nuHi = $derived(formatFixed(result.rangeWavenumber[1] / 1e3, 2));
  const area = $derived(formatThousands(result.integralEpsilonOverNu));
  const plainArea = $derived(formatEnotation(result.integralEpsilon, 4));

  const steps = $derived.by(() => {
    const first =
      scale.mode === 'emax'
        ? {
            title: 'Scale the curve to ε',
            text: 'The curve is scaled so that its tallest point equals the ε max you entered.',
            eq: `ε = A ÷ A<sub>peak</sub> × ε<sub>max</sub> → ε<sub>max</sub> = ${formatThousands(result.maxEpsilon)} L·mol⁻¹·cm⁻¹`,
          }
        : {
            title: 'Turn absorbance into ε',
            text: 'Absorbance is divided by concentration × path length.',
            eq: `ε = A ÷ (c·L) → ε<sub>max</sub> = ${formatThousands(result.maxEpsilon)} L·mol⁻¹·cm⁻¹`,
          };
    return [
      first,
      {
        title: 'Switch from wavelength to wavenumber',
        text: `Wavenumber counts waves per centimetre. The ${lo}–${hi} nm window becomes ${nuLo}–${nuHi} ×10³ cm⁻¹.`,
        eq: 'ν̃ = 10⁷ ÷ λ(nm)',
      },
      {
        title: 'Measure the area under the band',
        text: `ε divided by ν̃ is added up across the window (trapezoid rule, ${result.pointsUsed} points).`,
        eq: `∫ ε/ν̃ dν̃ = <b>${area}</b> L·mol⁻¹·cm⁻¹`,
      },
      {
        title: 'Convert the area into B₁₂',
        text: `The area is multiplied by a fixed factor made from ln 10, the speed of light, Planck's constant, n = ${refractiveIndex} and Avogadro's number.`,
        eq: `B₁₂ = ln(10)·1000·c ÷ (h·n·Nₐ) × ∫ = ${formatEnotation(result.factor, 4)} × ${formatThousands(result.integralEpsilonOverNu)} = <b>${formatEnotation(result.b12, 4)}</b>`,
      },
      {
        title: 'Get μ and f₁₂ from B₁₂',
        text: `The transition dipole moment follows from B₁₂. The oscillator strength uses the plain area ∫ε dν̃ (${plainArea}).`,
        eq: `μ = √(2h²·B₁₂ ÷ 8π³) = <b>${formatEnotation(result.transitionDipoleMoment, 4)}</b><br>f₁₂ = 4.39×10⁻⁹ · ∫ε dν̃ ÷ n = <b>${formatFixed(result.oscillatorStrength, 3)}</b>`,
      },
    ];
  });
</script>

<div class="panel">
  <div class="panel-h">
    <h3>How {id}'s numbers were worked out</h3>
    <span class="fine">Same method as the paper</span>
  </div>
  <div class="work">
    {#each steps as s, i (i)}
      <div class="step">
        <div class="n">{i + 1}</div>
        <div>
          <h4>{s.title}</h4>
          <p>{s.text}</p>
          <!-- the HTML below is built only from numbers and fixed text -->
          <div class="eq">{@html s.eq}</div>
        </div>
      </div>
    {/each}
  </div>
</div>
