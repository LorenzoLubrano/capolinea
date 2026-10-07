import {
  AirplaneTiltIcon,
  ArrowCounterClockwiseIcon,
  ArrowDownIcon,
  ArrowsClockwiseIcon,
  ArrowsLeftRightIcon,
  ArrowUpIcon,
  BackspaceIcon,
  BriefcaseIcon,
  CaretDownIcon,
  CaretRightIcon,
  ChartBarIcon,
  CheckIcon,
  DotsThreeIcon,
  EyeIcon,
  EyeSlashIcon,
  FilmSlateIcon,
  ForkKnifeIcon,
  GiftIcon,
  GraduationCapIcon,
  HeartbeatIcon,
  HouseIcon,
  LaptopIcon,
  LightningIcon,
  ListBulletsIcon,
  PlusIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  SparkleIcon,
  TargetIcon,
  TrainIcon,
  WarningIcon,
  XIcon,
  type IconWeight,
} from 'phosphor-react-native';

/** One icon family (Phosphor, MIT) for the whole app, iOS and Android alike. */
const icons = {
  AirplaneTilt: AirplaneTiltIcon,
  ArrowCounterClockwise: ArrowCounterClockwiseIcon,
  ArrowDown: ArrowDownIcon,
  ArrowsClockwise: ArrowsClockwiseIcon,
  ArrowsLeftRight: ArrowsLeftRightIcon,
  ArrowUp: ArrowUpIcon,
  Backspace: BackspaceIcon,
  Briefcase: BriefcaseIcon,
  CaretDown: CaretDownIcon,
  CaretRight: CaretRightIcon,
  ChartBar: ChartBarIcon,
  Check: CheckIcon,
  DotsThree: DotsThreeIcon,
  Eye: EyeIcon,
  EyeSlash: EyeSlashIcon,
  FilmSlate: FilmSlateIcon,
  ForkKnife: ForkKnifeIcon,
  Gift: GiftIcon,
  GraduationCap: GraduationCapIcon,
  Heartbeat: HeartbeatIcon,
  House: HouseIcon,
  Laptop: LaptopIcon,
  Lightning: LightningIcon,
  ListBullets: ListBulletsIcon,
  Plus: PlusIcon,
  ShoppingBag: ShoppingBagIcon,
  ShoppingCart: ShoppingCartIcon,
  Sparkle: SparkleIcon,
  Target: TargetIcon,
  Train: TrainIcon,
  Warning: WarningIcon,
  X: XIcon,
} as const;

export type IconName = keyof typeof icons;

export function Icon({
  name,
  size = 22,
  color,
  weight = 'regular',
}: {
  /** Category icons arrive as data strings; unknown names fall back to DotsThree. */
  name: IconName | string;
  size?: number;
  color: string;
  weight?: IconWeight;
}) {
  const Component = icons[name as IconName] ?? icons.DotsThree;
  return <Component size={size} color={color} weight={weight} />;
}
