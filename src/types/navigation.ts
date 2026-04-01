import { NativeStackScreenProps } from "@react-navigation/native-stack";

export type RootStackParamList = {
  Login: undefined;
  Home: { accountId?: string } | undefined;
  JoinRoom: undefined;
  CreateRoom: undefined;
  Room: { roomId: string; roomCode?: string } | undefined;
  Lobby: { roomId: string; roomCode?: string } | undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
