## 1. Small shape (circle, radius 0.5°) moved by placeGeometry from (0,0) to latitude φ
| φ | true area km² | Mercator area (code) | ratio to equator | 1/cos²φ | discrepancy | linear (sqrt) | 1/cosφ |
|---|---|---|---|---|---|---|---|
| 0° | 9,711 | 9,711 | 1.0000 | 1.0000 | 0.00% | 1.0000 | 1.0000 |
| 20° | 9,711 | 10,998 | 1.1325 | 1.1325 | 0.00% | 1.0642 | 1.0642 |
| 40° | 9,711 | 16,549 | 1.7041 | 1.7041 | 0.00% | 1.3054 | 1.3054 |
| 60° | 9,711 | 38,849 | 4.0005 | 4.0000 | 0.01% | 2.0001 | 2.0000 |
| 70° | 9,711 | 83,040 | 8.5511 | 8.5486 | 0.03% | 2.9242 | 2.9238 |
| 80° | 9,711 | 322,447 | 33.2041 | 33.1634 | 0.12% | 5.7623 | 5.7588 |
| 84° | 9,711 | 891,864 | 91.8401 | 91.5231 | 0.35% | 9.5833 | 9.5668 |
| 85° | 9,711 | 685,321 | 70.5712 | 131.6461 | -46.39% | 8.4007 | 11.4737 |

## 2. Countries: true area, apparent (Mercator) area at home and moved to the equator
| shape | true km² (geoArea) | stored props.a | anchor lat | Mercator km² at home (code) | exact Mercator (raster ∫sec²φ dA) | code vs exact | centroid 1/cos² prediction | inflation (exact) | moved to equator: true km² | moved: Mercator km² | shrink factor home→equator |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Greenland | 2,153,696 | 2,154,760 | 73.08 | 35,295,533 | 35,298,502 | -0.01% | 25,437,856 | 16.39× | 2,153,696 | 2,175,042 | 16.23× |
| DR Congo | 2,335,127 | 2,334,709 | -2.87 | 2,354,846 | 2,354,835 | 0.00% | 2,340,981 | 1.01× | 2,335,127 | 2,348,861 | 1.00× |
| Russia | 16,848,673 | 16,852,767 | 65.89 | 82,661,185 | 82,660,587 | 0.00% | 100,979,107 | 4.91× | 16,848,673 | 17,179,595 | 4.81× |
| Fiji | 17,600 | 18,398 | -17.82 | 19,334 | 19,334 | -0.00% | 19,419 | 1.10× | 17,600 | 17,603 | 1.10× |
| Australia | 7,704,072 | 7,706,030 | -25.63 | 9,633,096 | 9,633,084 | 0.00% | 9,477,768 | 1.25× | 7,704,072 | 7,797,531 | 1.24× |
| Antarctica | 12,253,944 | 12,256,398 | -84.68 | 290,772,189 | NaN | NaN% | 1,425,017,157 | NaN× | 12,253,944 | 12,647,690 | 22.99× |
| Canada | 9,735,703 | 9,872,129 | 58.73 | 50,401,847 | 50,693,404 | -0.58% | 36,127,793 | 5.21× | 9,735,703 | 9,937,393 | 5.07× |
| United States | 9,533,435 | 9,439,451 | 40.04 | 21,843,745 | 21,552,870 | 1.35% | 16,266,952 | 2.26× | 9,533,435 | 10,170,235 | 2.15× |

## 3. Greenland vs Africa
Africa (sum of 56 African shapes in present.json): true 29,986,146 km², Mercator-drawn 33,443,610 km² (equator-scale km²).
Greenland: true 2,153,696 km², Mercator-drawn 35,295,533 km².
True ratio Africa/Greenland = 13.92. Apparent (Mercator) ratio Africa/Greenland = 0.95.
Analytic check with centroids only: Greenland lat 73.1° → sec² = 11.81; Africa centroid ~ lat 2° → sec² ≈ 1.00 ⇒ predicted apparent ratio ≈ 1.18.
DR Congo: true 2,335,127 km² vs Greenland 2,153,696 km² (ratio 1.084); apparent ratio Greenland/DR Congo on a web map = 14.99.
Australia/Greenland true ratio = 3.58 (preset says "about three and a half times").

## 4. Russia moved to the equator
Russia (after dropFarParts) true 16,848,673 km²; Mercator-drawn at home 82,661,185; at the equator 17,179,595; shrink 4.81× in area (2.19× linear). Centroid-only prediction sec²(65.9°) = 5.99×.
At the equator the drawn area exceeds the true area by 1.96% (Russia still spans ~±20° of latitude after the move, so it is not exactly true size even there).
Preset "russia-at-equator" (lon 20, lat 2): drawn 17,201,815 km² → 4.81× smaller than at home.

## 5. Past ±85° (drag clamp ±80° on the anchor; world rect = ±85.0511°)
Mercator y at 85.0511° = 3.141593 R (= π), the app's MAX_MERC_Y. mercY() clamps input latitude to ±85°, latFromMercY(π) = 85.0511°.
| shape | anchor lat placed at | true km² | lat range after move | Mercator km² inside ±85.0511° (raster) | Mercator km² by geoPath (d3 default clip) | note |
|---|---|---|---|---|---|---|
| Greenland | 80° | 2,153,696 | -90.0° to 90.0° | 337,545,067 | 63,910,788 | part beyond 85.05° cut off |
| Greenland | -80° | 2,153,696 | -90.0° to -69.3° | 527,587,384 | 57,907,045 | part beyond 85.05° cut off |
| Australia | -80° | 7,704,072 | -88.7° to -63.9° | 180,751,421 | 180,793,875 | part beyond 85.05° cut off |
| DR Congo | 80° | 2,335,127 | 68.6° to 87.7° | 78,786,591 | 78,760,848 | part beyond 85.05° cut off |
Antarctica: true 12,253,944 km² (stored 12,256,398). d3 Mercator (clipped at ±85.0511°) draws 290,774,985 km² = 23.7× its true area. Unclipped, the Mercator area of a polar shape is infinite.

## 6. Antimeridian (Fiji, Chukotka)
Fiji: 5 parts in source (0 dropped as far-off), 2 edges lie on the ±180° seam; anchor 177.98, -17.82; true 17,600 km² (stored 18,398).
  Mercator area centred on anchor 19,334; centred on the opposite meridian (shape split across the map edge) 19,334 (-0.00%); raster exact 19,334 (-0.00%).
  Moved to (180,0): true 17,600, drawn 17,603 / centred at 0: 17,603. Moved to (0,0): drawn 17,603.
Russia: 88 parts in source (0 dropped as far-off), 0 edges lie on the ±180° seam; anchor 95.53, 65.89; true 16,848,673 km² (stored 16,852,767).
  Mercator area centred on anchor 82,661,185; centred on the opposite meridian (shape split across the map edge) 82,661,186 (0.00%); raster exact 82,660,587 (0.00%).
  Moved to (180,0): true 16,848,673, drawn 17,179,595 / centred at 0: 17,179,595. Moved to (0,0): drawn 17,179,595.

## 7. ShapeCard 'drawn N× smaller than at home' label vs the area actually drawn
| shape | home anchor lat | moved to lat | label (sec² ratio at anchor) | actual drawn-area ratio | label error |
|---|---|---|---|---|---|
| Greenland | 73.08° | 14.43° | 11.08× smaller | 15.20× smaller | 37.17% |
| Greenland | 73.08° | 0° | 11.81× smaller | 16.23× smaller | 37.39% |
| Greenland | 73.08° | 40° | 6.93× smaller | 9.35× smaller | 34.87% |
| Russia | 65.89° | 2° | 5.99× smaller | 4.81× smaller | -19.72% |
| Russia | 65.89° | 0° | 5.99× smaller | 4.81× smaller | -19.72% |
| Russia | 65.89° | 40° | 3.52× smaller | 2.91× smaller | -17.30% |
| Canada | 58.73° | 0° | 3.71× smaller | 5.07× smaller | 36.68% |
| Canada | 58.73° | 30° | 2.78× smaller | 3.62× smaller | 29.90% |
| United States | 40.04° | 0° | 1.71× smaller | 2.15× smaller | 25.87% |
| Australia | -25.63° | 0° | 1.23× smaller | 1.24× smaller | 0.42% |
| Australia | -25.63° | 60° | 3.25× bigger | 3.39× bigger | -4.01% |
| DR Congo | -2.87° | 60° | 3.99× bigger | 4.15× bigger | -3.83% |
| DR Congo | -2.87° | 70° | 8.53× bigger | 9.42× bigger | -9.49% |
| United Kingdom | 53.82° | 0° | 2.87× smaller | 2.92× smaller | 1.68% |
| Mexico | 23.92° | 48° | 1.87× bigger | 1.88× bigger | -0.81% |
