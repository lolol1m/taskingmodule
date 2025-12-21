from main_classes.RequestManager import RequestManager
from main_classes.Database import Database
from objects import User
import random
import time

a = RequestManager()
db = Database()
# print(db.client.query(User).first())

# from main_classes import MainController

# mc = MainController()
# print(mc.getAreas(a.getImages()[0]))
# print(mc.GetAssignees())

# print(a.get_images())
# print(a.get_areas(a.get_images()[0]))
# user = User()
# user.user_id = "1dsa"
# print(a.is_admin(user))
# db = Database()
# print(db.client.query(User).first())

lst = []
for i in range(0,10000):
    temp = User()
    temp.user_id = str(random.randint(1,100000000000000000000))
    lst.append(temp)
start = time.time()
db.insertObjects2(lst)
print(time.time()-start)