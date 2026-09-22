import { useId } from 'react';
import type { Garment } from '../types';

interface GarmentArtProps { garment: Garment; className?: string }

/** Original, resolution-independent flat-lay artwork for the starter wardrobe. */
export default function GarmentArt({ garment, className = '' }: GarmentArtProps) {
  const uid = `garment-${useId().replace(/:/g, '')}`;
  const color = /^#[0-9a-f]{6}$/i.test(garment.colorHex) ? garment.colorHex : '#8b8a81';
  const rgb = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16));
  const shade = (factor: number, lift = 0) => `rgb(${rgb.map(value => Math.min(255, Math.max(0, Math.round(value * factor + lift)))).join(',')})`;
  const isDark = rgb.reduce((sum, value) => sum + value, 0) < 250;
  const category = garment.category;
  const descriptor = `${garment.name} ${garment.subcategory}`.toLowerCase();
  const fill = `url(#${uid}-fabric)`;
  const pale = shade(0.9, 29);
  const deep = shade(0.48);
  const edge = shade(0.65);
  const seam = { fill: 'none', stroke: deep, strokeWidth: 0.85, opacity: 0.42, strokeLinecap: 'round' as const };
  const stitch = { fill: 'none', stroke: pale, strokeWidth: 0.6, opacity: 0.37, strokeDasharray: '1.8 1.6' };
  const shape = { fill, stroke: edge, strokeWidth: 0.7, strokeLinejoin: 'round' as const };
  const stripe = garment.pattern?.toLowerCase().includes('rig');
  const denim = category === 'Jeans' || descriptor.includes('denim');
  const button = (x: number, y: number, key?: string) => <g key={key}><circle cx={x} cy={y} r="1.65" fill={deep} /><circle cx={x - .4} cy={y - .5} r=".55" fill="#fff" opacity=".35" /></g>;

  if (garment.image) return <img className={`garment-art ${className}`} src={garment.image} alt={garment.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />;

  let art;
  if (['T-shirt', 'Polo', 'Camicia', 'Felpa', 'Maglione'].includes(category)) {
    const longSleeve = ['Camicia', 'Felpa', 'Maglione'].includes(category);
    const hoodie = category === 'Felpa';
    const shirt = category === 'Camicia';
    const polo = category === 'Polo';
    const body = longSleeve
      ? 'M91 48 Q103 43 108 43 L132 43 Q138 43 150 49 L174 59 Q179 62 181 72 L209 170 Q211 175 205 178 L184 184 Q177 186 176 178 L156 112 L157 210 Q139 219 82 211 L83 112 L63 178 Q62 184 57 183 L36 177 Q30 175 32 169 L61 70 Q63 62 68 59 Z'
      : 'M91 50 Q104 44 107 45 L133 45 Q140 46 150 50 L178 65 L200 104 L173 119 L157 94 L157 207 Q139 215 82 207 L82 94 L66 119 L39 104 L61 65 Z';
    art = <>
      <path d={body} {...shape} />
      <path d={body} fill={`url(#${uid}-texture)`} opacity={denim ? '.38' : '.19'} />
      {stripe && <path d={body} fill={`url(#${uid}-stripes)`} />}
      <path d="M87 92 Q94 131 86 194 M151 98 Q142 150 151 199" fill="none" stroke={deep} opacity=".18" strokeWidth="3" />
      <path d="M94 109 Q101 148 94 200 M139 106 Q134 164 143 196" fill="none" stroke="#fff" opacity=".055" strokeWidth="8" />
      <path d={longSleeve ? 'M64 72 Q69 89 83 98 M176 72 Q169 90 157 98' : 'M62 68 L82 94 M177 68 L157 94'} {...seam} />
      <path d="M85 203 Q120 210 154 203" {...stitch} />
      {longSleeve ? <>
        <path d="M33 167 L63 176 L60 184 L31 175 Z M179 176 L208 168 L211 176 L182 185 Z" fill={shade(.9)} stroke={edge} strokeWidth=".6" />
        <path d="M36 172 L59 179 M183 179 L206 172" {...stitch} />
        <path d="M60 121 Q52 150 47 163 M181 115 Q191 148 194 164" {...seam} opacity=".18" />
      </> : <>
        <path d="M42 101 L66 114 M174 114 L197 101" {...seam} />
        <path d="M43 103 L65 117 M176 117 L196 104" {...stitch} />
      </>}
      {hoodie ? <>
        <path d="M91 53 Q91 27 118 25 Q148 26 150 55 L135 78 L119 73 L103 78 Z" fill={shade(.89)} stroke={edge} strokeWidth="1" />
        <path d="M101 51 Q99 33 119 32 Q139 33 140 53 L122 70 Z" fill={deep} />
        <path d="M103 51 L119 71 L136 51" fill="none" stroke={pale} strokeWidth="1.5" opacity=".55" />
        <path d="M107 66 Q103 86 108 106 M132 65 Q136 84 132 102" stroke={pale} strokeWidth="1.25" fill="none" />
        <path d="M107 103 L108 108 M132 99 L132 104" stroke={deep} strokeWidth="2" />
        <path d="M98 150 L91 180 Q118 186 148 180 L141 150 Z" fill={shade(.96)} stroke={edge} strokeWidth=".65" />
        <path d="M99 152 L95 166 M141 152 L145 166 M96 178 Q120 183 144 178" {...stitch} />
        <path d="M82 200 Q119 207 157 200 L157 211 Q119 219 82 211 Z" fill={shade(.91)} stroke={edge} strokeWidth=".5" />
        <path d="M87 206 H150" {...stitch} />
      </> : shirt || polo ? <>
        <path d="M105 46 Q119 58 135 46 L138 60 L121 68 L102 59 Z" fill={deep} />
        <path d="M104 45 L119 60 L109 77 L94 56 Z" fill={shade(.93, 4)} stroke={edge} strokeWidth=".6" />
        <path d="M135 45 L120 60 L131 77 L145 55 Z" fill={shade(1, 6)} stroke={edge} strokeWidth=".6" />
        <path d={shirt ? 'M119 61 L119 210 L126 210 L125 65' : 'M119 61 L119 100 L126 100 L125 66'} fill={shade(.93)} stroke={edge} strokeWidth=".6" />
        {(shirt ? [83, 107, 131, 155, 180, 200] : [81, 94]).map((y, i) => button(122, y, String(i)))}
        {shirt && <><path d="M136 92 L151 92 L151 111 L143 115 L136 111 Z" fill={shade(.99)} stroke={edge} strokeWidth=".6" /><path d="M138 95 H149" {...stitch} /></>}
      </> : <>
        <path d="M101 46 Q104 67 121 68 Q138 67 140 46 L133 45 Q130 60 121 60 Q111 59 107 45 Z" fill={shade(.75)} stroke={edge} strokeWidth=".5" />
        <path d="M104 48 Q107 65 121 64 Q133 64 137 48" {...stitch} />
        {category === 'Maglione' && <><path d="M83 199 Q122 207 157 199 L157 211 Q121 219 82 211 Z" fill={shade(.85)} /><path d="M85 205 Q120 212 154 205" {...stitch} /><path d={body} fill={`url(#${uid}-knit)`} opacity=".27" /></>}
      </>}
      {category === 'T-shirt' && descriptor.includes('graphic') && <text x="119" y="118" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="700" fill={isDark ? '#e9e6da' : deep}>STUDIO</text>}
    </>;
  } else if (['Giacca', 'Cappotto'].includes(category)) {
    const coat = category === 'Cappotto';
    const bomber = descriptor.includes('bomber');
    const d = coat ? 'M91 45 L107 37 L134 37 L151 46 L176 63 L202 171 L179 179 L159 109 L166 225 Q142 232 120 226 Q96 232 73 225 L81 109 L60 180 L36 171 L62 64 Z' : 'M91 49 L106 41 L134 41 L149 49 L178 65 L206 173 L179 183 L157 113 L160 204 Q120 217 79 204 L82 112 L60 183 L33 173 L61 65 Z';
    art = <>
      <path d={d} {...shape} />
      <path d={d} fill={`url(#${uid}-texture)`} opacity=".24" />
      <path d="M105 42 L120 72 L135 42" fill={deep} />
      {bomber ? <>
        <path d="M104 43 Q120 65 137 43 L141 51 Q121 77 100 51 Z" fill={shade(.6)} />
        <path d="M80 197 Q120 210 159 197 L160 208 Q118 221 78 208 Z" fill={shade(.62)} />
        <path d="M34 166 L62 177 L59 186 L31 175 Z M177 178 L204 166 L208 176 L180 187 Z" fill={shade(.65)} />
        <path d="M120 64 L120 208" stroke={deep} strokeWidth="3" />
        <path d="M120 65 L120 207" stroke="#b6b9b7" strokeWidth=".85" strokeDasharray="1 1" opacity=".8" />
        <path d="M89 153 L105 172 M148 152 L133 171" stroke={deep} strokeWidth="3.5" /><path d="M89 151 L105 170 M148 150 L133 169" stroke={pale} opacity=".4" />
        <path d="M63 103 L55 136 L65 139 L74 109 Z" fill={shade(.8)} stroke={edge} strokeWidth=".5" />
        <path d="M65 109 L59 132" stroke="#a3a29a" strokeWidth=".75" />
      </> : <>
        <path d="M105 38 L118 70 L102 104 L93 86 L103 80 L87 51 Z" fill={shade(.84, 6)} stroke={edge} strokeWidth=".7" />
        <path d="M135 38 L120 70 L137 106 L149 86 L138 80 L153 52 Z" fill={shade(.97, 8)} stroke={edge} strokeWidth=".7" />
        <path d={coat ? 'M120 72 L120 226' : 'M120 72 L120 210'} stroke={deep} strokeWidth="1" />
        {(coat ? [115, 148, 181, 213] : [105, 130, 155, 180, 200]).map((y, i) => button(126, y, String(i)))}
        {coat ? <>
          <path d="M85 152 L106 157 L104 164 L83 159 Z M137 157 L158 152 L160 159 L139 164 Z" fill={shade(.88)} stroke={edge} strokeWidth=".65" />
          <path d="M81 212 Q97 220 117 217 M124 217 Q143 221 160 213" {...stitch} />
        </> : <>
          <path d="M88 91 H111 V118 L100 123 L89 118 Z M133 91 H154 L153 118 L143 123 L133 118 Z" fill={shade(.95)} stroke={edge} strokeWidth=".7" />
          <path d="M88 91 L100 99 L111 91 M133 91 L143 99 L154 91" fill={shade(.86)} stroke={edge} strokeWidth=".7" />
          {button(100, 99)}{button(143, 99)}
          <path d="M85 154 L104 166 M153 154 L137 166 M90 127 L89 196 M150 127 L152 196" {...seam} />
          <path d="M82 201 Q120 212 158 201" {...stitch} />
        </>}
      </>}
      <path d="M63 68 Q68 96 83 105 M177 68 Q171 96 157 105 M83 124 Q92 147 84 189 M157 124 Q148 147 158 189" {...seam} />
      <path d="M52 153 L69 157 M189 154 L175 158" stroke={deep} strokeWidth="2" opacity=".13" />
    </>;
  } else if (['Jeans', 'Pantaloni', 'Shorts'].includes(category)) {
    const shorts = category === 'Shorts';
    const cargo = descriptor.includes('cargo');
    const d = shorts ? 'M76 69 Q120 75 164 69 L174 179 Q150 186 128 179 L120 133 L110 179 Q87 186 66 177 Z' : 'M79 34 Q120 40 161 34 L173 126 L162 228 L126 228 L120 126 L113 228 L77 228 L69 126 Z';
    art = <g transform={shorts ? 'rotate(-5 120 125)' : 'rotate(4 120 130)'}>
      <path d={d} {...shape} />
      <path d={d} fill={`url(#${uid}-texture)`} opacity={denim ? '.45' : '.22'} />
      <path d={shorts ? 'M76 69 Q120 75 164 69 L165 79 Q120 85 75 79 Z' : 'M79 34 Q120 40 161 34 L162 44 Q120 50 78 44 Z'} fill={shade(.89)} stroke={edge} strokeWidth=".65" />
      <path d={shorts ? 'M120 81 L120 125 Q129 120 129 113 L129 82' : 'M120 47 L120 113 Q129 108 129 96 L129 48'} fill={shade(.93)} stroke={edge} strokeWidth=".75" />
      {button(122, shorts ? 76 : 41)}
      <path d={shorts ? 'M79 82 Q83 109 101 112 M161 82 Q157 109 139 112' : 'M82 47 Q86 74 103 80 M158 47 Q154 74 137 80'} {...seam} />
      <path d={shorts ? 'M81 83 Q85 107 101 110 M159 83 Q155 107 139 110' : 'M84 48 Q88 73 103 78 M156 48 Q152 73 137 78'} {...stitch} />
      <path d={shorts ? 'M91 71 V82 M150 71 V82 M116 74 V84' : 'M92 36 V47 M149 36 V47 M116 39 V49'} stroke={edge} strokeWidth="3.4" />
      <path d={shorts ? 'M91 71 V82 M150 71 V82 M116 74 V84' : 'M92 36 V47 M149 36 V47 M116 39 V49'} stroke={pale} strokeWidth="1" opacity=".5" />
      <path d={shorts ? 'M72 113 L68 174 M165 111 L172 175 M120 131 L110 176 M121 135 L129 176' : 'M77 87 L73 127 L80 221 M163 85 L169 129 L159 221 M118 128 L110 222 M123 128 L129 222'} {...stitch} />
      {!shorts && <>
        <path d="M94 91 Q88 134 97 195 M146 91 Q151 136 144 195" stroke="#fff" strokeWidth={denim ? '14' : '2'} opacity={denim ? '.07' : '.09'} fill="none" />
        <path d="M82 134 Q96 130 108 141 M83 142 L103 150 M132 140 Q147 130 164 137 M137 148 L159 143" {...seam} opacity=".16" />
        <path d="M77 220 H113 V230 H77 Z M126 220 H163 V230 H126 Z" fill={shade(.85)} stroke={edge} strokeWidth=".6" />
        <path d="M80 225 H110 M129 225 H160" {...stitch} />
      </>}
      {shorts && <path d="M69 173 Q88 180 109 174 M130 174 Q151 180 172 175" {...stitch} />}
      {cargo && <><path d="M74 123 L103 125 L103 158 L76 160 Z M140 125 L169 123 L167 158 L140 160 Z" fill={shade(.92)} stroke={edge} strokeWidth=".75" /><path d="M74 123 L76 132 L101 134 L103 125 M140 125 L142 134 L167 132 L169 123" fill={shade(.83)} stroke={edge} strokeWidth=".65" /></>}
    </g>;
  } else if (['Sneakers', 'Scarpe eleganti'].includes(category)) {
    const sneaker = category === 'Sneakers';
    const high = descriptor.includes('jordan') || descriptor.includes('high');
    const sole = sneaker ? '#e5e2d6' : '#302d29';
    const shoe = (x: number, y: number, rotation: number, back = false) => <g transform={`translate(${x} ${y}) rotate(${rotation} 95 42)`}>
      <path d="M19 58 Q14 65 18 70 Q25 79 68 80 L151 80 Q174 77 178 69 L176 59 Z" fill={sole} stroke={sneaker ? '#bbb8af' : '#191815'} strokeWidth=".85" />
      <path d="M20 69 Q47 76 84 75 L150 75 Q163 75 174 68" fill="none" stroke={sneaker ? '#aaa79e' : '#504a40'} strokeWidth=".8" />
      <path d={high ? 'M21 58 L24 18 Q43 9 67 15 L71 34 L107 49 Q123 47 151 51 Q174 53 176 61 Q157 70 122 68 L66 69 Q38 68 21 62 Z' : 'M20 58 L24 32 Q36 26 55 34 L68 24 L100 45 Q120 46 148 49 Q170 51 177 60 Q158 71 123 68 L64 69 Q36 68 20 61 Z'} {...shape} />
      <path d="M20 58 Q32 45 46 48 L63 67 Q38 69 20 61 Z" fill={shade(.83)} stroke={edge} strokeWidth=".8" />
      <path d={high ? 'M24 20 Q43 13 64 19 L66 30 Q45 25 24 32 Z' : 'M25 32 Q40 26 55 35 L66 27 L64 37 Q48 42 26 39 Z'} fill={deep} />
      <path d="M66 28 L59 43 L100 61 L115 47 L100 44 Z" fill={shade(.83, 14)} stroke={edge} strokeWidth=".8" />
      {sneaker ? <>
        <path d="M49 45 Q51 57 69 63 L122 64 Q141 67 153 62 L141 49 L109 48 L95 58 L68 50 Z" fill={back ? shade(.81, 9) : shade(.93, 16)} stroke={edge} strokeWidth=".65" />
        <path d="M122 51 Q135 47 152 51 Q169 54 173 60 L152 64 Q138 66 125 62 Z" fill={shade(.92, 17)} stroke={edge} strokeWidth=".65" />
        <path d="M123 53 Q142 50 163 58" {...stitch} />
        <path d="M28 59 Q45 64 65 65 L123 65" {...stitch} />
        {[0, 1, 2, 3].map(i => <g key={i}><circle cx={70 + i * 8} cy={37 + i * 4} r="1.5" fill={deep} /><path d={`M${64 + i * 8} ${41 + i * 4} l10 -4`} stroke="#e4e0d4" strokeWidth="2.2" strokeLinecap="round" /></g>)}
        <path d="M66 54 L76 48 M72 59 L86 52 M80 62 L96 57" stroke={deep} strokeWidth="3" opacity=".25" />
        {[133, 140, 147].map(x => <circle key={x} cx={x} cy="55" r=".65" fill={deep} opacity=".55" />)}
      </> : <>
        <path d="M104 46 Q116 53 113 67 M43 38 Q50 44 51 65" {...seam} />
        <path d="M127 51 Q151 51 165 58" stroke="#fff" strokeWidth="3" fill="none" opacity=".14" />
        {[0, 1, 2, 3].map(i => <path key={i} d={`M${66 + i * 7} ${41 + i * 3.5} l9 -3`} stroke={shade(.4)} strokeWidth="1.5" strokeLinecap="round" />)}
        <path d="M22 75 H60 V84 H24 Z" fill="#292622" />
      </>}
    </g>;
    art = <>{shoe(22, 44, -23, true)}{shoe(1, 118, -23)}</>;
  } else {
    const cap = /cappell|cap\b|berrett/.test(descriptor);
    const glasses = /occhial|sunglass/.test(descriptor);
    const watch = /orolog|watch/.test(descriptor);
    const scarf = /sciarpa|scarf/.test(descriptor);
    const belt = /cintura|belt/.test(descriptor);
    art = belt ? <g transform="rotate(-22 120 130)">
      <ellipse cx="118" cy="123" rx="70" ry="48" fill="none" stroke={deep} strokeWidth="20"/>
      <ellipse cx="118" cy="120" rx="69" ry="46" fill="none" stroke={color} strokeWidth="15"/>
      <ellipse cx="118" cy="120" rx="69" ry="46" fill="none" stroke={pale} strokeWidth=".7" strokeDasharray="2 2"/>
      <path d="M51 120 Q57 165 117 166 L191 166 L207 156 L192 146 L123 147 Q77 146 69 120Z" {...shape}/>
      <path d="M76 143 Q95 157 122 157 H189" {...stitch}/>
      {[137,148,159,170,181].map(x=><circle key={x} cx={x} cy="156" r="1.5" fill={deep}/>)}
      <rect x="47" y="102" width="39" height="28" rx="5" fill="none" stroke="#aaaea5" strokeWidth="6"/>
      <path d="M63 102 V130 M63 115 H83" fill="none" stroke="#d5d5ca" strokeWidth="3" strokeLinecap="round"/>
      <path d="M89 140 L91 162" stroke={deep} strokeWidth="8"/>
    </g> : cap ? <g transform="translate(0 -1) rotate(-12 120 130)">
      <path d="M54 137 Q47 80 88 62 Q126 48 156 80 Q178 106 172 138 Z" {...shape} />
      <path d="M54 137 Q107 116 174 136 Q199 152 203 169 Q156 188 105 166 Z" fill={shade(.84)} stroke={edge} strokeWidth=".8" />
      <path d="M57 137 Q108 116 170 136 M101 61 Q119 81 116 125 M155 81 Q145 93 146 127" {...seam} />
      <path d="M61 139 Q110 123 167 140 M104 165 Q156 184 197 167" {...stitch} />
      <ellipse cx="104" cy="61" rx="6" ry="3" fill={shade(.72)} />
      <path d="M101 96 L108 97 L106 110 L99 109 Z" fill={pale} opacity=".8" />
      <ellipse cx="75" cy="91" rx="1.3" ry="2" fill={deep} /><ellipse cx="131" cy="84" rx="1.5" ry="2" fill={deep} />
    </g> : glasses ? <g transform="rotate(-13 120 125)">
      <path d="M44 123 L63 71 L105 73 M194 123 L180 68 L139 70" fill="none" stroke={deep} strokeWidth="6" strokeLinecap="round" />
      <path d="M37 113 Q67 106 98 113 L105 123 Q119 116 135 123 L142 113 Q172 106 204 113 L201 148 Q196 164 167 164 Q140 162 136 133 Q121 126 104 134 Q100 164 69 164 Q43 163 39 147 Z" fill={shade(.65)} stroke={deep} strokeWidth="2" />
      <path d="M45 119 Q68 114 93 120 L97 132 Q96 155 71 157 Q49 156 46 143 Z M145 120 Q172 114 196 119 L195 143 Q191 157 167 157 Q145 155 143 133 Z" fill={`url(#${uid}-glass)`} />
      <path d="M52 122 L84 121 L51 147 M150 123 L184 121 L148 144" fill="#fff" opacity=".075" />
      <path d="M39 119 H46 M196 119 H202" stroke="#b6b0a3" strokeWidth="2" />
    </g> : watch ? <g transform="rotate(20 120 130)">
      <path d="M104 27 L135 27 L139 221 Q121 233 101 221 Z" fill={shade(.63)} stroke={deep} />
      <path d="M109 34 V86 M131 35 V86 M108 169 V219 M133 169 V219" {...stitch} />
      <rect x="89" y="86" width="64" height="80" rx="23" fill="#b7b8b1" stroke="#747870" strokeWidth="2" />
      <rect x="93" y="90" width="56" height="72" rx="20" fill="#e3e3d7" />
      <circle cx="121" cy="126" r="24" fill={deep} />
      <path d="M121 108 V127 L135 135" fill="none" stroke="#d6d4c9" strokeWidth="2" strokeLinecap="round" />
      <circle cx="121" cy="126" r="2" fill="#d6d4c9" />
      <path d="M153 119 H158 V130 H153" fill="#92958d" />
    </g> : scarf ? <g transform="rotate(-12 120 130)">
      <path d="M72 42 Q114 35 151 52 L161 101 L139 121 L171 199 L134 214 L94 113 L104 83 L83 80 L93 221 L55 225 Z" {...shape} />
      <path d="M77 47 L66 218 M87 48 L76 218 M119 126 L148 204 M132 123 L158 201" {...seam} />
      <path d="M58 221 V233 M64 220 V233 M70 220 V232 M76 219 V231 M82 218 V230 M88 217 V229 M137 211 L141 221 M144 208 L148 218 M151 205 L155 215 M158 202 L162 212 M165 199 L169 209" stroke={color} strokeWidth="2" />
      <path d="M91 50 Q114 58 115 81 L106 107 Q133 120 160 99" {...seam} />
    </g> : <g transform="rotate(-7 120 137)">
      <path d="M79 93 Q80 43 117 42 Q155 40 160 94" fill="none" stroke={deep} strokeWidth="12" />
      <path d="M79 93 Q80 43 117 42 Q155 40 160 94" fill="none" stroke={shade(.95)} strokeWidth="7" />
      <path d="M59 90 Q120 84 178 90 L187 211 Q123 230 49 210 Z" {...shape} />
      <path d="M59 90 Q120 100 178 90 L178 102 Q118 112 58 102 Z" fill={shade(.8)} />
      <path d="M63 106 L56 206 Q120 221 180 207 L174 106" {...stitch} />
      <path d="M80 80 L78 125 M157 80 L160 125" stroke={deep} strokeWidth="11" />
      <path d="M80 80 L78 125 M157 80 L160 125" stroke={shade(.95)} strokeWidth="7" />
      {button(79, 119)}{button(159, 119)}
      <rect x="104" y="149" width="30" height="19" rx="1.5" fill={shade(.64)} />
      <path d="M110 155 H127 M114 160 H123" stroke={pale} strokeWidth="1" opacity=".65" />
      <path d="M62 176 Q71 182 62 198 M174 164 Q166 184 177 201" {...seam} opacity=".16" />
    </g>;
  }

  return <svg className={`garment-art ${className}`} viewBox="0 0 240 260" role="img" aria-labelledby={`${uid}-title`} xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
    <title id={`${uid}-title`}>{garment.name}</title>
    <defs>
      <linearGradient id={`${uid}-fabric`} x1="0" y1="0" x2="1" y2=".7">
        <stop offset="0" stopColor={shade(.85)} /><stop offset=".22" stopColor={shade(1, isDark ? 12 : 6)} /><stop offset=".48" stopColor={color} /><stop offset=".76" stopColor={shade(.92)} /><stop offset="1" stopColor={shade(.71)} />
      </linearGradient>
      <linearGradient id={`${uid}-glass`} x1="0" y1="0" x2=".7" y2="1"><stop stopColor="#181e1b" /><stop offset="1" stopColor="#485444" /></linearGradient>
      <pattern id={`${uid}-texture`} patternUnits="userSpaceOnUse" width="3" height="3"><path d="M0 1 L1 0 M1 3 L3 1" stroke="#fff" strokeWidth=".35" opacity=".45" /><path d="M0 2 L2 0" stroke="#000" strokeWidth=".35" opacity=".3" /></pattern>
      <pattern id={`${uid}-knit`} patternUnits="userSpaceOnUse" width="3.5" height="4"><path d="M.5 0 L1.75 2 L3 0 M.5 2 L1.75 4 L3 2" stroke={deep} strokeWidth=".4" fill="none" /></pattern>
      <pattern id={`${uid}-stripes`} patternUnits="userSpaceOnUse" width="10" height="11"><path d="M0 3 H10" stroke={isDark ? '#d8d7ca' : '#313c43'} strokeWidth="3" opacity=".7" /></pattern>
      <filter id={`${uid}-shadow`} x="-30%" y="-20%" width="160%" height="160%"><feDropShadow dx="1" dy="6" stdDeviation="4.5" floodColor="#000" floodOpacity=".22" /><feDropShadow dx="0" dy="1" stdDeviation=".6" floodColor="#000" floodOpacity=".14" /></filter>
    </defs>
    <g filter={`url(#${uid}-shadow)`}>{art}</g>
  </svg>;
}
