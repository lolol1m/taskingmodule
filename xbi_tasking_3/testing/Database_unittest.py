import unittest
import psycopg2

from main_classes import Database, ConfigClass

class Database_unittest(unittest.TestCase):
    @classmethod
    def setUpClass(self):
        ConfigClass("testing.config")
        self.db = Database()
        if ConfigClass._instance.getDatabaseName() != "XBI_TASKING_3_TEST":
            print("PLS CHECK YOUR config file")
            exit()
        else:
            self.tearDownClass()
    
    @classmethod
    def tearDownClass(self):
        self.db.deleteAll()

    def setUp(self):
        self.db.deleteAll()

    def tearDown(self):
        self.db.deleteAll()
    
    def test_executeSelect_baseCase(self):
        res = self.db.executeSelect("SELECT name FROM task_status")
        res.sort()
        exp = [('Completed',), ('In Progress',), ('Incomplete',), ('Verifying',)]
        self.assertEqual(res, exp, "cursor fails to open")

    def test_executeSelect_fail_case_invalid_statement(self):
        def fail_case():
            res = self.db.executeSelect("sadsadisadu9w0uasuod")
        self.assertRaises(psycopg2.errors.SyntaxError, fail_case)
    
    def test_executeInsert_baseCase(self):
        self.db.executeInsert("INSERT INTO sensor(id, name) VALUES (1, 'SB')")
        res = self.db.executeSelect("SELECT id, name FROM sensor")
        exp = [(1, 'SB')]
        self.assertEqual(res, exp, "insert failed")
    
    def test_executeInsert_returning_id_baseCase(self):
        res = type(self.db.executeInsertReturningID("INSERT INTO sensor(name) VALUES ('SB') RETURNING id"))
        exp = type(3)
        self.assertEqual(res, exp, "id not returned")
    
    def test_executeUpdate_baseCase(self):
        self.db.executeInsert("INSERT INTO sensor(id, name) VALUES (1, 'SB')")
        self.db.executeUpdate("UPDATE sensor SET name='SR' WHERE name='SB'")
        res = self.db.executeSelect("SELECT id, name FROM sensor")
        exp = [(1, 'SR')]
        self.assertEqual(res, exp, "update failed")
    
    def test_executeDelete_baseCase(self):
        self.db.executeInsert("INSERT INTO sensor(id, name) VALUES (1, 'SB')")
        self.db.executeDelete("DELETE FROM sensor WHERE name='SB'")
        res = self.db.executeSelect("SELECT id FROM sensor")
        exp = []
        self.assertEqual(res, exp, "delete failed")
    
    def test_executeInsertMany_baseCase(self):
        temp = [('hello',),  ('hello hello',), ('pair of hello hello',), ('walrus',)]
        self.db.executeInsertMany(f"INSERT INTO users (name) VALUES (%s)", temp)
        res = self.db.executeSelect("SELECT * from users")[0][1]
        exp = 'hello'
        self.assertEqual(res, exp, "executeInsertMany does not work")

    def test_executeUpdateMany_baseCase(self):
        self.db.executeInsert("INSERT INTO sensor(id, name) VALUES (1, 'SB')")
        self.db.executeInsert("INSERT INTO sensor(id, name) VALUES (2, 'SR')")
        self.db.executeUpdateMany("UPDATE sensor SET name=%s WHERE name=%s",(('SB2','SB'),('SR2','SR')))
        res = self.db.executeSelect("SELECT id, name FROM sensor")
        exp = [(1, 'SB2'), (2, 'SR2')]
        self.assertEqual(res, exp, "update failed")
    
    def startUnitTest(self):
        unittest.main()